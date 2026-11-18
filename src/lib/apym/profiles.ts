import type { GymAuthorizationContext } from "@/lib/rbac/types";

export type ApymPanelProfile = "manager" | "trainer" | "reception";

/**
 * Maps an already-authorized active account role to the APYM panel persona.
 * This is a presentation/profile classification, not an authorization check.
 * Trainer access to a specific member must separately validate TrainerClient.
 */
export function resolveApymPanelProfile(
  input: Pick<GymAuthorizationContext, "accountMemberRole" | "gymStaffRole" | "userActive">,
): ApymPanelProfile | null {
  const { accountMemberRole, gymStaffRole, userActive } = input;

  if (!userActive || !accountMemberRole) return null;

  if (accountMemberRole === "OWNER" || accountMemberRole === "ADMIN") {
    return "manager";
  }

  if (accountMemberRole === "STAFF") {
    switch (gymStaffRole) {
      case "MANAGER": return "manager";
      case "TRAINER": return "trainer";
      case "RECEPTION": return "reception";
      default: return null;
    }
  }

  return null;
}
