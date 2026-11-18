import type { Session } from "next-auth";
import { accountRoleHasPermission } from "@/lib/rbac/account-roles";
import type { GymAuthorizationContext } from "@/lib/rbac/types";

/**
 * Business permissions derive only from a server-validated account/gym context.
 */

export type Permission =
  | "canViewMembers"
  | "canEditMembers"
  | "canRegisterMembers"
  | "canViewAttendance"
  | "canManageAttendance"
  | "canViewPayments"
  | "canEditPayments"
  | "canCreatePayments"
  | "canViewAssignedMembers"
  | "canViewAssignedWorkouts"
  | "canPrescribeWorkouts"
  | "canViewRenewals"
  | "canEditRenewals"
  | "canViewReminders"
  | "canEditReminders"
  | "canViewReports"
  | "canViewWhatsAppReminders"
  | "canSendWhatsAppReminders"
  | "canSendBulkReminders";

export class PermissionError extends Error {
  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionError";
  }
}

/**
 * Session is accepted temporarily so unmigrated handlers stay type-compatible,
 * but it grants nothing. Task 4 migrates those call sites to the gym context.
 */
export function hasPermission(
  context: GymAuthorizationContext | Session | null,
  permission: Permission,
): boolean {
  if (!isGymAuthorizationContext(context)) return false;
  return accountRoleHasPermission(context, permission);
}

/**
 * Require a permission or throw PermissionError.
 * Use in API routes to enforce permissions.
 */
export function requirePermission(
  context: GymAuthorizationContext | Session | null,
  permission: Permission,
): void {
  if (!hasPermission(context, permission)) {
    throw new PermissionError(permission);
  }
}

/**
 * Check multiple permissions (AND logic).
 */
export function hasAllPermissions(context: GymAuthorizationContext | Session | null, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(context, p));
}

/**
 * Check if user has any of the permissions (OR logic).
 */
export function hasAnyPermission(context: GymAuthorizationContext | Session | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(context, p));
}

/**
 * Require any of the permissions or throw.
 */
export function requireAnyPermission(context: GymAuthorizationContext | Session | null, permissions: Permission[]): void {
  if (!hasAnyPermission(context, permissions)) {
    throw new PermissionError(permissions[0]);
  }
}

function isGymAuthorizationContext(
  value: GymAuthorizationContext | Session | null,
): value is GymAuthorizationContext {
  return Boolean(
    value &&
      "userId" in value &&
      "accountId" in value &&
      "gymId" in value &&
      "gymStaffRole" in value &&
      "userActive" in value,
  );
}
