import type { Permission } from "@/lib/permissions";
import type { EffectivePermissionContext } from "@/lib/rbac/types";
import { resolveApymPanelProfile } from "@/lib/apym/profiles";

export type { EffectivePermissionContext };

const RECEPTION_PERMISSIONS: Permission[] = [
  "canViewMembers",
  "canRegisterMembers",
  "canViewAttendance",
  "canManageAttendance",
  "canViewPayments",
  "canCreatePayments",
];

const MANAGER_PERMISSIONS: Permission[] = [
  "canViewMembers",
  "canEditMembers",
  "canRegisterMembers",
  "canViewAttendance",
  "canManageAttendance",
  "canViewPayments",
  "canEditPayments",
  "canCreatePayments",
  "canViewRenewals",
  "canEditRenewals",
  "canViewReminders",
  "canEditReminders",
  "canViewReports",
  "canViewWhatsAppReminders",
  "canSendWhatsAppReminders",
  "canSendBulkReminders",
];

const TRAINER_PERMISSIONS: Permission[] = [
  "canViewAssignedMembers",
  "canViewAssignedWorkouts",
  "canPrescribeWorkouts",
];

export function resolveAccountPermissions(ctx: EffectivePermissionContext): Set<Permission> {
  return permissionsForGymContext(ctx);
}

export function permissionsForGymContext(ctx: EffectivePermissionContext): Set<Permission> {
  const profile = resolveApymPanelProfile(ctx);
  switch (profile) {
    case "manager":
      return new Set(MANAGER_PERMISSIONS);
    case "trainer":
      return new Set(TRAINER_PERMISSIONS);
    case "reception":
      return new Set(RECEPTION_PERMISSIONS);
    default:
      return new Set();
  }
}

export function accountRoleHasPermission(
  ctx: EffectivePermissionContext,
  permission: Permission,
): boolean {
  return permissionsForGymContext(ctx).has(permission);
}
