-- APYM G2 Phase 2: read-only staging census.
-- PostgreSQL / psql compatible. Executable statements are transaction control
-- plus SELECT only, wrapped in a read-only transaction. No data/schema changes.
--
-- OPERATOR CHECKLIST
-- 1) Run only on the sanitized staging snapshot / read-only staging endpoint.
-- 2) Verify query 1 reports the expected staging database before sharing results.
-- 3) Replace every CENSUS_SALT placeholder below with the same random local
--    secret (32+ random characters). Do not send the salt or raw IDs back.
-- 4) Return aggregate results and pseudonymized IDs only; do not share the
--    executed SQL/history containing your substituted salt or connection info.
--    Pseudonyms are linkable across result sets and are not anonymous data.
-- 5) If the read-only transaction cannot be established, stop; do not rerun
--    against another URL or remove the READ ONLY guard.

BEGIN TRANSACTION READ ONLY;

-- 1. Target confirmation and read-only transaction check. Confirm db_label and
--    schema with the staging owner before running the remaining SELECTs.
SELECT
  current_database() AS db_label,
  current_schema() AS schema_name,
  current_setting('transaction_read_only') AS transaction_read_only,
  current_setting('server_version') AS postgres_version;

-- 2. High-level inventory. Accounts and gyms have no active/suspended column
--    in the current Prisma schema; this reports their stored totals only.
SELECT
  (SELECT COUNT(*) FROM "User") AS users_total,
  (SELECT COUNT(*) FROM "User" WHERE "isActive" = true) AS users_active,
  (SELECT COUNT(*) FROM "Account") AS accounts_total,
  (SELECT COUNT(*) FROM "Gym") AS gyms_total,
  (SELECT COUNT(DISTINCT "accountId") FROM "Gym") AS accounts_with_gyms,
  (SELECT COUNT(*) FROM "Member") AS members_total,
  (SELECT COUNT(*) FROM "TrainerClient") AS trainer_client_links_total,
  (SELECT COUNT(*) FROM "TrainerCommission") AS trainer_commissions_total,
  to_regclass(format('%I.%I', current_schema(), 'GymStaffAssignment')) IS NOT NULL
    AS gym_staff_assignment_table_present;

-- 3. Legacy global User role and isTrainer inventory; no identity fields.
SELECT
  "role"::text AS legacy_user_role,
  "isActive" AS user_active,
  "isTrainer" AS legacy_is_trainer,
  COUNT(*) AS users_count,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM "AccountMembership" am
    WHERE am."userId" = "User"."id" AND am."isActive" = true
  )) AS users_with_any_active_account_membership
FROM "User"
GROUP BY "role", "isActive", "isTrainer"
ORDER BY "role"::text, "isActive", "isTrainer";

-- 4. Account membership inventory and multi-account identities.
SELECT
  "role"::text AS account_membership_role,
  "isActive" AS membership_active,
  COUNT(*) AS memberships_count,
  COUNT(DISTINCT "accountId") AS accounts_count,
  COUNT(DISTINCT "userId") AS users_count
FROM "AccountMembership"
GROUP BY "role", "isActive"
ORDER BY "role"::text, "isActive";

SELECT
  membership_count,
  COUNT(*) AS users_count
FROM (
  SELECT "userId", COUNT(*) AS membership_count
  FROM "AccountMembership"
  WHERE "isActive" = true
  GROUP BY "userId"
) active_membership_counts
GROUP BY membership_count
ORDER BY membership_count;

-- 5. Account/gym size profile. Account/gym IDs are pseudonymized; names and
--    contact fields are intentionally excluded.
WITH census_salt AS (
  SELECT 'REPLACE_CENSUS_SALT_LOCALLY_DO_NOT_SHARE'::text AS value
)
SELECT
  md5(census_salt.value || ':' || a."id"::text) AS account_ref,
  COUNT(DISTINCT g."id") AS gyms_count,
  COUNT(DISTINCT am."userId") FILTER (WHERE am."isActive") AS active_member_users_count,
  COUNT(DISTINCT am."userId") FILTER (WHERE am."isActive" AND am."role" = 'OWNER') AS active_owners_count,
  COUNT(DISTINCT am."userId") FILTER (WHERE am."isActive" AND am."role" = 'ADMIN') AS active_admins_count,
  COUNT(DISTINCT am."userId") FILTER (WHERE am."isActive" AND am."role" = 'STAFF') AS active_staff_count
FROM "Account" a
LEFT JOIN "Gym" g ON g."accountId" = a."id"
LEFT JOIN "AccountMembership" am ON am."accountId" = a."id"
GROUP BY a."id", census_salt.value
ORDER BY account_ref;

-- 6. Legacy accountId / persisted membership discrepancies. Counts only.
SELECT
  COUNT(*) FILTER (WHERE u."accountId" IS NOT NULL) AS users_with_legacy_account_id,
  COUNT(*) FILTER (WHERE u."accountId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "AccountMembership" am
    WHERE am."userId" = u."id" AND am."accountId" = u."accountId"
  )) AS legacy_account_without_matching_membership,
  COUNT(*) FILTER (WHERE u."accountId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "AccountMembership" am
    WHERE am."userId" = u."id" AND am."accountId" = u."accountId" AND am."isActive"
  )) AS legacy_account_without_active_matching_membership,
  COUNT(*) FILTER (WHERE u."accountId" IS NULL) AS users_without_legacy_account_id
FROM "User" u;

SELECT
  COUNT(*) AS active_memberships,
  COUNT(*) FILTER (WHERE u."isActive" = false) AS active_memberships_for_inactive_users,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM "Gym" g WHERE g."accountId" = am."accountId"
  )) AS active_memberships_for_accounts_without_gyms
FROM "AccountMembership" am
JOIN "User" u ON u."id" = am."userId"
WHERE am."isActive" = true;

-- 7. Pseudonymized candidate matrix for manual STAFF-by-gym review. Each row
--    is evidence only; these rows are NOT an instruction or automatic backfill.
--    Includes inactive membership/user rows so they can be excluded explicitly.
--    When query 2 says the G2 table is absent, no operational role can be
--    represented per gym in the pre-G2 schema; every row is review-only.
WITH census_salt AS (
  SELECT 'REPLACE_CENSUS_SALT_LOCALLY_DO_NOT_SHARE'::text AS value
)
SELECT
  md5(census_salt.value || ':' || am."userId") AS user_ref,
  md5(census_salt.value || ':' || am."accountId"::text) AS account_ref,
  md5(census_salt.value || ':' || g."id"::text) AS gym_ref,
  am."role"::text AS account_role,
  am."isActive" AS membership_active,
  u."isActive" AS user_active,
  u."role"::text AS legacy_global_role,
  u."isTrainer" AS legacy_is_trainer_evidence_only,
  COALESCE(tc.active_links_in_gym, 0) AS active_trainer_client_links_in_gym,
  COALESCE(tc.current_links_in_gym, 0) AS current_trainer_client_links_in_gym,
  COALESCE(comm.commissions_in_gym, 0) AS commission_rows_in_gym_evidence_only
FROM "AccountMembership" am
JOIN "User" u ON u."id" = am."userId"
JOIN "Gym" g ON g."accountId" = am."accountId"
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE t."isActive") AS active_links_in_gym,
    COUNT(*) FILTER (
      WHERE t."isActive"
        AND t."startDate" <= CURRENT_TIMESTAMP
        AND (t."endDate" IS NULL OR t."endDate" >= CURRENT_TIMESTAMP)
    ) AS current_links_in_gym
  FROM "TrainerClient" t
  WHERE t."trainerId" = am."userId" AND t."gymId" = g."id"
) tc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS commissions_in_gym
  FROM "TrainerCommission" c
  WHERE c."trainerId" = am."userId" AND c."gymId" = g."id"
) comm ON true
CROSS JOIN census_salt
WHERE am."role" = 'STAFF'
ORDER BY account_ref, gym_ref, user_ref;

-- 8. Role-mapping evidence counts. These must not be converted automatically
--    into MANAGER/TRAINER/RECEPTION grants.
SELECT
  am."role"::text AS account_role,
  am."isActive" AS membership_active,
  u."isActive" AS user_active,
  u."role"::text AS legacy_global_role,
  u."isTrainer" AS legacy_is_trainer,
  COUNT(*) AS user_account_membership_pairs
FROM "AccountMembership" am
JOIN "User" u ON u."id" = am."userId"
GROUP BY am."role", am."isActive", u."isActive", u."role", u."isTrainer"
ORDER BY am."role"::text, am."isActive", u."isActive", u."role"::text, u."isTrainer";

-- 9. TrainerClient reconciliation. IDs are pseudonymized; no member/trainer
--    names, phones, email, health data or photos are returned.
WITH census_salt AS (
  SELECT 'REPLACE_CENSUS_SALT_LOCALLY_DO_NOT_SHARE'::text AS value
)
SELECT
  md5(census_salt.value || ':' || tc."trainerId") AS trainer_ref,
  md5(census_salt.value || ':' || tc."memberId") AS member_ref,
  md5(census_salt.value || ':' || tc."gymId"::text) AS gym_ref,
  tc."isActive" AS link_active,
  tc."startDate" <= CURRENT_TIMESTAMP AS link_started,
  (tc."endDate" IS NULL OR tc."endDate" >= CURRENT_TIMESTAMP) AS link_not_ended,
  u."isActive" AS trainer_user_active,
  (m."gymId" = tc."gymId") AS member_is_in_link_gym,
  EXISTS (
    SELECT 1 FROM "Gym" g
    JOIN "AccountMembership" am
      ON am."accountId" = g."accountId"
     AND am."userId" = tc."trainerId"
     AND am."isActive" = true
    WHERE g."id" = tc."gymId"
  ) AS trainer_has_active_membership_in_gym_account,
  CASE
    WHEN NOT tc."isActive" THEN 'INACTIVE'
    WHEN tc."startDate" > CURRENT_TIMESTAMP THEN 'FUTURE'
    WHEN tc."endDate" IS NOT NULL AND tc."endDate" < CURRENT_TIMESTAMP THEN 'EXPIRED'
    WHEN u."isActive" IS DISTINCT FROM true THEN 'INACTIVE_TRAINER_USER'
    WHEN m."gymId" IS DISTINCT FROM tc."gymId" THEN 'MEMBER_GYM_MISMATCH'
    WHEN NOT EXISTS (
      SELECT 1 FROM "Gym" g
      JOIN "AccountMembership" am
        ON am."accountId" = g."accountId"
       AND am."userId" = tc."trainerId"
       AND am."isActive" = true
      WHERE g."id" = tc."gymId"
    ) THEN 'NO_ACTIVE_ACCOUNT_MEMBERSHIP'
    ELSE 'CURRENT_CANDIDATE_REQUIRES_MANUAL_ROLE_CONFIRMATION'
  END AS link_review_status
FROM "TrainerClient" tc
LEFT JOIN "User" u ON u."id" = tc."trainerId"
LEFT JOIN "Member" m ON m."id" = tc."memberId"
CROSS JOIN census_salt
ORDER BY gym_ref, trainer_ref, member_ref;

-- 10. TrainerClient anomaly totals for compact reporting.
SELECT
  COUNT(*) AS trainer_client_rows,
  COUNT(*) FILTER (WHERE tc."isActive") AS active_rows,
  COUNT(*) FILTER (WHERE tc."isActive" AND tc."startDate" > CURRENT_TIMESTAMP) AS active_rows_starting_in_future,
  COUNT(*) FILTER (WHERE tc."isActive" AND tc."endDate" IS NOT NULL AND tc."endDate" < CURRENT_TIMESTAMP) AS active_rows_already_ended,
  COUNT(*) FILTER (WHERE m."id" IS NULL) AS links_without_member_row,
  COUNT(*) FILTER (WHERE u."id" IS NULL) AS links_without_user_row,
  COUNT(*) FILTER (WHERE m."id" IS NOT NULL AND m."gymId" <> tc."gymId") AS member_gym_mismatches,
  COUNT(*) FILTER (WHERE u."id" IS NOT NULL AND u."isActive" = false) AS links_for_inactive_users
FROM "TrainerClient" tc
LEFT JOIN "Member" m ON m."id" = tc."memberId"
LEFT JOIN "User" u ON u."id" = tc."trainerId";

-- 11. Commission evidence, not authorization. No financial amounts are returned.
WITH census_salt AS (
  SELECT 'REPLACE_CENSUS_SALT_LOCALLY_DO_NOT_SHARE'::text AS value
)
SELECT
  md5(census_salt.value || ':' || c."trainerId") AS trainer_ref,
  md5(census_salt.value || ':' || c."gymId"::text) AS gym_ref,
  COUNT(*) AS commission_rows,
  COUNT(*) FILTER (WHERE c."isPaid") AS paid_commission_rows,
  COUNT(*) FILTER (WHERE NOT c."isPaid") AS unpaid_commission_rows,
  COUNT(*) FILTER (WHERE m."id" IS NULL) AS missing_member_rows,
  COUNT(*) FILTER (WHERE m."id" IS NOT NULL AND m."gymId" <> c."gymId") AS member_gym_mismatches
FROM "TrainerCommission" c
LEFT JOIN "Member" m ON m."id" = c."memberId"
CROSS JOIN census_salt
GROUP BY c."trainerId", c."gymId", census_salt.value
ORDER BY gym_ref, trainer_ref;

-- 12. If GymStaffAssignment table is already present in this snapshot, this
-- query is safe; otherwise skip it (the base census above remains runnable).
-- Run only after query 2 reports gym_staff_assignment_table_present = true.
-- Never interpret existing rows as valid without checking active membership,
-- user state, gym/account match and the unique-active invariant.
--
-- SELECT
--   "role"::text AS operational_role,
--   "isActive" AS assignment_active,
--   COUNT(*) AS assignment_rows,
--   COUNT(DISTINCT "userId") AS distinct_users,
--   COUNT(DISTINCT "gymId") AS distinct_gyms
-- FROM "GymStaffAssignment"
-- GROUP BY "role", "isActive"
-- ORDER BY "role"::text, "isActive";

-- 13. Optional: once query 2 confirms GymStaffAssignment exists, uncomment and
-- run this to find active STAFF × gym pairs without one valid active role.
-- This block intentionally references the G2 table and MUST stay commented
-- while the table is absent. The base query 7 is valid before the migration.
--
-- WITH census_salt AS (
--   SELECT 'REPLACE_CENSUS_SALT_LOCALLY_DO_NOT_SHARE'::text AS value
-- )
-- SELECT
--   md5(census_salt.value || ':' || am."userId") AS user_ref,
--   md5(census_salt.value || ':' || am."accountId"::text) AS account_ref,
--   md5(census_salt.value || ':' || g."id"::text) AS gym_ref,
--   COUNT(gsa."id") FILTER (WHERE gsa."isActive") AS active_assignments,
--   COUNT(gsa."id") AS historical_assignments
-- FROM "AccountMembership" am
-- JOIN "User" u ON u."id" = am."userId"
-- JOIN "Gym" g ON g."accountId" = am."accountId"
-- LEFT JOIN "GymStaffAssignment" gsa
--   ON gsa."userId" = am."userId"
--  AND gsa."accountId" = am."accountId"
--  AND gsa."gymId" = g."id"
-- CROSS JOIN census_salt
-- WHERE am."role" = 'STAFF'
--   AND am."isActive" = true
--   AND u."isActive" = true
-- GROUP BY am."userId", am."accountId", g."id", census_salt.value
-- HAVING COUNT(gsa."id") FILTER (WHERE gsa."isActive") = 0
-- ORDER BY account_ref, gym_ref, user_ref;

COMMIT;
