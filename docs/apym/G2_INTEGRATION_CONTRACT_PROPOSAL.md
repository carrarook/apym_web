# APYM ↔ Gymkhana integration contract (draft)

**Status:** proposal for review; no synchronization endpoint is implemented.
**Updated:** 2026-11-17
**Scope:** identity, authorization assertion, academy/member references and workout publication.
**No database or public API changes are included in this draft.**

## Accepted authority boundary

The accepted decision is: **APYM is authoritative for memberships that grant APYM app access; Gymkhana remains authoritative for panel memberships and permissions.**

Use one writer per meaning:

| Data / decision | Authority | Other system |
|---|---|---|
| Login identity and credential | Supabase Auth | Gymkhana stores a verified external identity link |
| APYM tenant existence/status and access grants (app.tenants, app.tenant_users) | APYM API/database | Gymkhana stores an APYM tenant reference |
| Gym profile, account ownership, member profile, commercial membership | Gymkhana | APYM receives only the minimum app-access projection it needs |
| Gymkhana panel role and trainer-to-member delegation | Gymkhana | Signed, narrow action assertion is presented to APYM for a particular request |
| Prescription versions, authorizations, sessions and execution history | APYM API/database | Gymkhana retains only returned IDs/status needed by the editor |

Gymkhana Membership is a commercial plan/period. app.tenant_users is APYM access and role membership. They are not the same record. If an active commercial membership controls mobile access, its state may be projected into APYM access, but the projection must carry a source version and be reconciled; Gymkhana remains the source for the commercial fact and APYM remains the authorization point for app access.

The cross-system map is kept by Gymkhana and has unique source and target keys:

- (Gymkhana account ID, Gymkhana Gym ID) ↔ APYM tenant UUID
- Gymkhana User ID ↔ Supabase Auth User UUID
- Gymkhana Member ID ↔ Supabase Auth User UUID/APYM member UUID, only after the member has a verified Supabase identity.

No mapping is inferred from e-mail, name, phone, or numeric/UUID coercion. APYM creates its tenant ID. Gymkhana IDs remain opaque external references.

## Identity contract

| Contract name | Current representation | Rule |
|---|---|---|
| supabaseUserId | UUID | Supabase Auth sub; canonical login identity |
| gymkhanaUserId | string (User.id, currently CUID) | Panel actor, carried as act.sub; never substitute it for sub |
| gymkhanaGymId | UUID | Gymkhana Gym.id; distinct from tenant |
| apymTenantId | UUID | APYM tenants.id; sent as X-Tenant-Id |
| gymkhanaMemberId | opaque string | Gymkhana Member.id; preserve exactly |
| apymMemberId | UUID | In the current APYM schema, workout_plans.member_id and session member_id reference tenant_users.auth_user_id; therefore this UUID is the student's Supabase Auth ID, not a separate APYM Member entity |

A user link is created only after the person proves both the NextAuth session and a valid Supabase Auth session. The server validates the Supabase token and stores its UUID; it does not return or persist the access/refresh token. E-mail equality is not proof.

Mapping record examples (draft JSON only; they do not describe current Prisma models):

~~~json
{
  "gymkhanaAccountId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "gymkhanaGymId": "22222222-2222-4222-8222-222222222222",
  "apymTenantId": "11111111-1111-4111-8111-111111111111",
  "status": "active",
  "verifiedAt": "2026-11-17T12:00:00Z"
}
~~~

~~~json
{
  "gymkhanaUserId": "cmf7x2p4s0000v1abc1234567",
  "supabaseUserId": "33333333-3333-4333-8333-333333333333",
  "status": "active",
  "verifiedAt": "2026-11-17T12:00:00Z"
}
~~~

~~~json
{
  "gymkhanaMemberId": "member_01HZX8C4Y7M",
  "supabaseUserId": "44444444-4444-4444-8444-444444444444",
  "apymMemberId": "44444444-4444-4444-8444-444444444444",
  "status": "active",
  "verifiedAt": "2026-11-17T12:00:00Z"
}
~~~

The future Gymkhana mapping store should enforce uniqueness on both sides of each mapping. A remap must revoke the old link and create an audited replacement; silently overwriting identity or tenant mappings is forbidden.

**Schema discrepancy to resolve before migration:** the request describes a separate gymkhana schema in Supabase, while the current Prisma checkout has no Prisma schemas/@@schema("gymkhana") declarations and its initial migration creates public. This proposal does not change either schema or database.

## Draft Gymkhana actor JWT

This assertion is separate from the Supabase JWT used by Flutter. It is signed by the Gymkhana backend with an asymmetric key. The example shows a single workout publication grant; claims are not provided by the browser.

Protected header:

~~~json
{
  "alg": "ES256",
  "kid": "gymkhana-apym-2026-01",
  "typ": "JWT"
}
~~~

Payload example (timestamps and IDs are illustrative):

~~~json
{
  "iss": "https://gymkhana.example.test/integrations/apym",
  "aud": "apym-api",
  "sub": "33333333-3333-4333-8333-333333333333",
  "act": { "sub": "cmf7x2p4s0000v1abc1234567" },
  "apym_tenant_id": "11111111-1111-4111-8111-111111111111",
  "gymkhana_gym_id": "22222222-2222-4222-8222-222222222222",
  "apym_member_id": "44444444-4444-4444-8444-444444444444",
  "gymkhana_member_id": "member_01HZX8C4Y7M",
  "scope": ["workouts:publish"],
  "iat": 1800000000,
  "nbf": 1800000000,
  "exp": 1800000120,
  "jti": "55555555-5555-4555-8555-555555555555"
}
~~~

Proposed verifier requirements:

1. API accepts the Gymkhana issuer only on explicitly approved server-to-server routes; preserve the existing Supabase JWT scheme and Flutter flow.
2. Verify the JWS signature using HTTPS JWKS and kid; allow only configured asymmetric algorithms (proposed ES256). Reject none, HMAC, unknown key IDs and key/algorithm confusion.
3. Require exact configured iss, aud=apym-api, UUID Supabase sub, actor act.sub, iat, nbf, exp, jti, tenant, Gym, target member and narrow scope.
4. Enforce a maximum 120-second lifetime and small clock skew. The API compares claim tenant/member/action to X-Tenant-Id and the route/body. Client-supplied role headers/fields never grant permission.
5. Independently require an active APYM tenant and active tenant_users records for the actor and target with the required APYM roles. Gymkhana's backend must have checked active account membership, per-gym role, active user, trainer delegation and matching Gym/Member before issuing the assertion. A signed action scope is not a platform-admin grant.
6. Audit iss, sub, act.sub, tenant, action and jti; never log bearer tokens.

jti helps correlate issuance but does not stop replay. A captured assertion remains replayable until expiry. The 120-second expiry limits that window; mutation retries additionally need Idempotency-Key with request-hash conflict behavior. If one-use JWTs are required, APYM needs a replay cache (for example Redis or durable storage); it is a separate design/cost decision. Revoking a Gymkhana link does not invalidate already-issued assertions before exp unless APYM also has revocation/introspection support.

## Existing API surface (verified locally)

The current versioned OpenAPI is middleware/api/openapi/v1.json. It has 18 operations and no Gymkhana issuer, mapping, sync or idempotency contract.

| Need | Existing route | Current behavior / limitation |
|---|---|---|
| Create APYM academy | POST /api/v1/admin/tenants | Platform admin only; creates pending tenant and owner invitation. Gymkhana manager cannot call it as platform admin. |
| Accept invitation | POST /api/v1/invitations/accept | Supabase-authenticated user accepts matching verified-email invitation. |
| Invite APYM teacher/student | POST /api/v1/admin/tenants/{tenantId}/invitations | Active APYM owner or platform admin; role is trainer or student; this is not a Gymkhana membership upsert. |
| Publish a workout | POST /api/v1/members/{memberId}/workouts | Supabase Bearer, X-Tenant-Id, UUID member and {planId,snapshot}; no Idempotency-Key is documented. Handler does not currently check Gymkhana TrainerClient delegation. |
| Read/execute a workout | GET /api/v1/workouts/current, /api/v1/sessions... | Flutter/APYM operations remain on the current Supabase JWT flow. |

No route currently synchronizes an external Gym, Gymkhana User, or Gymkhana Member ID. Do not treat these proposed needs as existing endpoints.

Payloads already implemented by the APYM API:

~~~json
{ "name": "Academia Exemplo", "slug": "academia-exemplo", "ownerEmail": "owner@example.test" }
~~~

~~~json
{ "email": "trainer@example.test", "role": "trainer" }
~~~

~~~json
{ "token": "<one-time-invitation-token>" }
~~~

~~~json
{
  "planId": "66666666-6666-4666-8666-666666666666",
  "snapshot": {
    "items": [
      {
        "exerciseId": "77777777-7777-4777-8777-777777777777",
        "estimatedMinutesPerSet": 5,
        "sets": [{ "setId": "88888888-8888-4888-8888-888888888888" }]
      }
    ]
  }
}
~~~

## Proposed integration operations (not implemented)

1. **Academy onboarding:** initially retain the current platform-admin tenant creation route. After it returns tenantId, Gymkhana records the unique Gym → Tenant map. Automated Gym provisioning would need a separately approved, platform-controlled endpoint or workflow; do not delegate platform-admin authority to a gym manager.
2. **APYM teacher/student enrollment:** initially use the APYM invitation and acceptance flow. APYM creates the membership only after the invitee authenticates and accepts; Gymkhana does not directly write tenant_users. A Gymkhana manager cannot currently call the APYM owner/platform-admin invitation route. If automation is approved, a candidate route is POST /api/v1/integrations/gymkhana/v1/tenants/{tenantId}/invitations with the invitation body shown above and a scope limited to the requested role. This is a new route, not a current contract. APYM retains the final decision and writes its own membership; no Gymkhana-supplied role claim is authority by itself.
3. **Identity map:** complete the Gymkhana User/Member to Supabase UUID link only after the person proves both sessions. Keep the Gymkhana ID as an opaque reference; the APYM member key is the Supabase UUID in the current API schema. This mapping remains in Gymkhana; APYM does not need a new mapping table for the current workout routes.
4. **Prescriptions:** retain the existing publication resource and request shape. After the Gymkhana actor scheme and scoped delegation verification are approved, add Idempotency-Key and document its replay/conflict behavior. No new fake workout URL is proposed.
5. **Session data:** remains APYM-owned and is not synchronized into Gymkhana as a second writable record.

Membership sync must not become a second write path. Gymkhana may request an APYM invitation or report a source fact under an approved integration policy; APYM remains responsible for accepting/rejecting the request and persisting app access. Commercial membership status alone does not silently grant or revoke APYM roles.

## Unit-test contract (database-free)

src/lib/apym/integration-contract.ts validates the draft assertion claims and binds them to a request. It does not sign tokens or verify JWS signatures; those checks belong to the future .NET authentication scheme.

Tests cover:

- Supabase and APYM UUIDs versus opaque Gymkhana user/member strings.
- Required iss, aud, UUID sub, act.sub, tenant/Gym/member references, one narrow action, timestamps and jti.
- Reject unknown role claim to prevent the browser role field being mistaken for authority.
- Wrong issuer/audience, expiry, future nbf/iat, lifetime beyond 120 seconds.
- Tenant, Gym, member or action mismatch between signed claims and the request.

Cryptographic signature verification, JWKS rotation, APYM membership queries, delegation checks and idempotent endpoint behavior remain tests for the later approved server implementation; they are not claimed by these pure contract tests.

## Risks and decisions still open

- **Teacher-to-student delegation:** APYM's current tenant_users schema has no Gymkhana TrainerClient data. The proposed signed, single-action assertion lets APYM verify a trusted Gymkhana authorization decision without an APYM migration; alternative is add/sync delegation state into APYM, which requires a schema/API design.
- **Schema placement:** resolve public vs gymkhana against the intended Prisma runtime/database configuration before any migration.
- **Replay:** accept a bounded 120-second bearer replay window plus mutation idempotency, or require a distributed one-use jti cache.
- **Identity-link ceremony:** choose a browser flow that proves both sessions and handles unlink/relink and account recovery without e-mail-only matching.
- **Tenant provisioning:** decide whether platform admin manually creates/links tenants initially or a separately privileged automation endpoint is approved.
- **Role projection:** define the exact mapping from Gymkhana staff assignment to APYM owner/trainer/student; do not infer it from legacy User.role or isTrainer.
- **Membership changes:** define source version, deletion/suspension behavior, retries and reconciliation frequency for the APYM access projection.

