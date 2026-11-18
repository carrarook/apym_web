import { z } from "zod";

const UUIDSchema = z.string().uuid();
const GymkhanaIdentifierSchema = z.string().min(1).max(255);
const IntegrationActionSchema = z.enum(["workouts:publish"]);
const MappingStatusSchema = z.enum(["active", "revoked"]);

export const ApymGymTenantMappingSchema = z
  .object({
    gymkhanaAccountId: UUIDSchema,
    gymkhanaGymId: UUIDSchema,
    apymTenantId: UUIDSchema,
    status: MappingStatusSchema,
    verifiedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const ApymIdentityLinkSchema = z
  .object({
    gymkhanaUserId: GymkhanaIdentifierSchema,
    supabaseUserId: UUIDSchema,
    status: MappingStatusSchema,
    verifiedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const ApymMemberLinkSchema = z
  .object({
    gymkhanaMemberId: GymkhanaIdentifierSchema,
    supabaseUserId: UUIDSchema,
    apymMemberId: UUIDSchema,
    status: MappingStatusSchema,
    verifiedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine((link) => link.supabaseUserId === link.apymMemberId, {
    message: "Current APYM member ID must equal the linked Supabase user ID.",
    path: ["apymMemberId"],
  });

/**
 * Draft claims exchanged by the Gymkhana backend and APYM API.
 *
 * This validates claim shape and request binding only. It does not verify a
 * JWT signature; the APYM API must verify the JWS with the configured issuer's
 * JWKS before trusting these claims.
 */
export const GymkhanaActorClaimsSchema = z
  .object({
    iss: z.string().url(),
    aud: z.string().min(1),
    sub: UUIDSchema,
    act: z.object({ sub: GymkhanaIdentifierSchema }).strict(),
    apym_tenant_id: UUIDSchema,
    gymkhana_gym_id: UUIDSchema,
    apym_member_id: UUIDSchema,
    gymkhana_member_id: GymkhanaIdentifierSchema,
    scope: z.array(IntegrationActionSchema).length(1),
    iat: z.number().int().nonnegative(),
    nbf: z.number().int().nonnegative(),
    exp: z.number().int().nonnegative(),
    jti: UUIDSchema,
  })
  .strict();

export type GymkhanaActorClaims = z.infer<typeof GymkhanaActorClaimsSchema>;

export type GymkhanaActorRequestBinding = {
  tenantId: string;
  gymId: string;
  apymMemberId: string;
  action: z.infer<typeof IntegrationActionSchema>;
};

export type GymkhanaActorClaimsValidation =
  | { valid: true; claims: GymkhanaActorClaims }
  | {
      valid: false;
      reason:
        | "invalid_claims"
        | "issuer_mismatch"
        | "audience_mismatch"
        | "expired"
        | "not_yet_valid"
        | "issued_in_future"
        | "lifetime_too_long"
        | "tenant_mismatch"
        | "gym_mismatch"
        | "member_mismatch"
        | "scope_mismatch";
    };

const MAX_ASSERTION_LIFETIME_SECONDS = 120;
const CLOCK_SKEW_SECONDS = 30;

export function validateGymkhanaActorClaims(
  input: unknown,
  config: {
    issuer: string;
    audience: string;
    nowUnixSeconds: number;
    request: GymkhanaActorRequestBinding;
  },
): GymkhanaActorClaimsValidation {
  const parsed = GymkhanaActorClaimsSchema.safeParse(input);
  if (!parsed.success) return { valid: false, reason: "invalid_claims" };

  const claims = parsed.data;
  if (claims.iss !== config.issuer) {
    return { valid: false, reason: "issuer_mismatch" };
  }
  if (claims.aud !== config.audience) {
    return { valid: false, reason: "audience_mismatch" };
  }
  if (claims.exp <= config.nowUnixSeconds) {
    return { valid: false, reason: "expired" };
  }
  if (claims.nbf > config.nowUnixSeconds + CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: "not_yet_valid" };
  }
  if (claims.iat > config.nowUnixSeconds + CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: "issued_in_future" };
  }
  if (claims.exp <= claims.iat || claims.nbf > claims.exp) {
    return { valid: false, reason: "invalid_claims" };
  }
  if (claims.exp - claims.iat > MAX_ASSERTION_LIFETIME_SECONDS) {
    return { valid: false, reason: "lifetime_too_long" };
  }
  if (claims.apym_tenant_id !== config.request.tenantId) {
    return { valid: false, reason: "tenant_mismatch" };
  }
  if (claims.gymkhana_gym_id !== config.request.gymId) {
    return { valid: false, reason: "gym_mismatch" };
  }
  if (claims.apym_member_id !== config.request.apymMemberId) {
    return { valid: false, reason: "member_mismatch" };
  }
  if (!claims.scope.includes(config.request.action)) {
    return { valid: false, reason: "scope_mismatch" };
  }

  return { valid: true, claims };
}
