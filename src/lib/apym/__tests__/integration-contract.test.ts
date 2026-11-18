import {
  ApymGymTenantMappingSchema,
  ApymIdentityLinkSchema,
  ApymMemberLinkSchema,
  validateGymkhanaActorClaims,
  type GymkhanaActorRequestBinding,
  type GymkhanaActorClaims,
} from "../integration-contract";

const NOW = 1_800_000_000;
const ISSUER = "https://gymkhana.example.test/integrations/apym";
const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const GYM_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_SUPABASE_ID = "33333333-3333-4333-8333-333333333333";
const STUDENT_SUPABASE_ID = "44444444-4444-4444-8444-444444444444";
const JTI = "55555555-5555-4555-8555-555555555555";
const GYMKHANA_USER_ID = "cmf7x2p4s0000v1abc1234567";
const GYMKHANA_MEMBER_ID = "member_01HZX8C4Y7M";

const expectedRequest = {
  tenantId: TENANT_ID,
  gymId: GYM_ID,
  apymMemberId: STUDENT_SUPABASE_ID,
  action: "workouts:publish",
} as const;

function validClaims(
  overrides: Partial<GymkhanaActorClaims> = {},
): GymkhanaActorClaims {
  return {
    iss: ISSUER,
    aud: "apym-api",
    sub: ACTOR_SUPABASE_ID,
    act: { sub: GYMKHANA_USER_ID },
    apym_tenant_id: TENANT_ID,
    gymkhana_gym_id: GYM_ID,
    apym_member_id: STUDENT_SUPABASE_ID,
    gymkhana_member_id: GYMKHANA_MEMBER_ID,
    scope: ["workouts:publish"],
    iat: NOW - 10,
    nbf: NOW - 10,
    exp: NOW + 110,
    jti: JTI,
    ...overrides,
  };
}

describe("Gymkhana to APYM identity mapping contracts (draft)", () => {
  it("accepts distinct academy IDs without equating Gym and tenant identifiers", () => {
    const mapping = {
      gymkhanaAccountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      gymkhanaGymId: GYM_ID,
      apymTenantId: TENANT_ID,
      status: "active",
      verifiedAt: "2026-11-17T12:00:00Z",
    };

    expect(ApymGymTenantMappingSchema.parse(mapping)).toEqual(mapping);
    expect(mapping.gymkhanaGymId).not.toBe(mapping.apymTenantId);
  });

  it("requires an explicit verified link between Gymkhana and Supabase users", () => {
    const link = {
      gymkhanaUserId: GYMKHANA_USER_ID,
      supabaseUserId: ACTOR_SUPABASE_ID,
      status: "active",
      verifiedAt: "2026-11-17T12:00:00Z",
    };

    expect(ApymIdentityLinkSchema.parse(link)).toEqual(link);
    expect(
      ApymIdentityLinkSchema.safeParse({ ...link, verifiedAt: undefined }).success,
    ).toBe(false);
  });

  it("requires the current APYM member identifier to equal the student's Supabase user UUID", () => {
    const link = {
      gymkhanaMemberId: GYMKHANA_MEMBER_ID,
      supabaseUserId: STUDENT_SUPABASE_ID,
      apymMemberId: STUDENT_SUPABASE_ID,
      status: "active",
      verifiedAt: "2026-11-17T12:00:00Z",
    };

    expect(ApymMemberLinkSchema.parse(link)).toEqual(link);
    expect(
      ApymMemberLinkSchema.safeParse({
        ...link,
        apymMemberId: ACTOR_SUPABASE_ID,
      }).success,
    ).toBe(false);
  });
});

describe("Gymkhana to APYM actor assertion contract (draft)", () => {
  it("accepts a valid, short-lived assertion scoped to the exact tenant, gym, student and action", () => {
    const result = validateGymkhanaActorClaims(validClaims(), {
      issuer: ISSUER,
      audience: "apym-api",
      nowUnixSeconds: NOW,
      request: expectedRequest,
    });

    expect(result).toEqual({ valid: true, claims: validClaims() });
  });

  it("keeps Gymkhana's opaque member ID distinct from APYM's UUID member ID", () => {
    const claims = validClaims();

    expect(claims.gymkhana_member_id).toBe(GYMKHANA_MEMBER_ID);
    expect(claims.apym_member_id).toBe(STUDENT_SUPABASE_ID);
    expect(claims.gymkhana_member_id).not.toBe(claims.apym_member_id);
    expect(
      validateGymkhanaActorClaims(
        { ...claims, gymkhana_member_id: STUDENT_SUPABASE_ID },
        {
          issuer: ISSUER,
          audience: "apym-api",
          nowUnixSeconds: NOW,
          request: expectedRequest,
        },
      ).valid,
    ).toBe(true);
  });

  it.each([
    ["issuer", { iss: "https://attacker.example.test" }, "issuer_mismatch"],
    ["audience", { aud: "another-service" }, "audience_mismatch"],
    ["expired exp", { exp: NOW }, "expired"],
    ["future nbf", { nbf: NOW + 31 }, "not_yet_valid"],
    ["future iat", { iat: NOW + 31 }, "issued_in_future"],
    ["long lifetime", { iat: NOW - 121, exp: NOW + 1 }, "lifetime_too_long"],
    ["missing jti", { jti: undefined }, "invalid_claims"],
    ["non-UUID actor sub", { sub: GYMKHANA_USER_ID }, "invalid_claims"],
    ["client role claim", { role: "trainer" } as Partial<GymkhanaActorClaims>, "invalid_claims"],
  ])("rejects invalid %s", (_caseName, overrides, reason) => {
    const result = validateGymkhanaActorClaims(
      { ...validClaims(), ...overrides },
      {
        issuer: ISSUER,
        audience: "apym-api",
        nowUnixSeconds: NOW,
        request: expectedRequest,
      },
    );

    expect(result).toEqual({ valid: false, reason });
  });

  it.each([
    ["tenant", { ...expectedRequest, tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, "tenant_mismatch"],
    ["gym", { ...expectedRequest, gymId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, "gym_mismatch"],
    ["student", { ...expectedRequest, apymMemberId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, "member_mismatch"],
    ["action", { ...expectedRequest, action: "workouts:revoke" as const }, "scope_mismatch"],
  ])("rejects a request with a different %s than the signed assertion", (_name, request, reason) => {
    const result = validateGymkhanaActorClaims(validClaims(), {
      issuer: ISSUER,
      audience: "apym-api",
      nowUnixSeconds: NOW,
      request: request as GymkhanaActorRequestBinding,
    });

    expect(result).toEqual({ valid: false, reason });
  });
});
