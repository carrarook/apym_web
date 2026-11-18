import {
  accountRoleHasPermission,
  resolveAccountPermissions,
} from "@/lib/rbac/account-roles";
import { hasPermission } from "@/lib/permissions";
import {
  agentHasScope,
  normalizeRequestedScopes,
  parseAgentScopes,
} from "@/lib/rbac/agent-scopes";
import type { Permission } from "@/lib/permissions";

function context(accountMemberRole: "OWNER" | "ADMIN" | "STAFF" | null, gymStaffRole: "MANAGER" | "TRAINER" | "RECEPTION" | null, userActive = true) {
  return {
    userId: "user-1",
    accountId: "account-1",
    gymId: "gym-1",
    accountMemberRole,
    gymStaffRole,
    userActive,
  } as const;
}

function permissionsFor(accountMemberRole: "OWNER" | "ADMIN" | "STAFF" | null, gymStaffRole: "MANAGER" | "TRAINER" | "RECEPTION" | null, userActive = true) {
  return resolveAccountPermissions(context(accountMemberRole, gymStaffRole, userActive));
}

function hasCapability(permissions: Set<Permission>, permission: string): boolean {
  return permissions.has(permission as Permission);
}

describe("account RBAC", () => {
  it("OWNER has edit permissions", () => {
    expect(
      accountRoleHasPermission(
        context("OWNER", null),
        "canEditPayments",
      ),
    ).toBe(true);
  });

  it("STAFF reception assignment does not grant manager permissions", () => {
    const perms = permissionsFor("STAFF", "RECEPTION");
    expect(perms.has("canEditPayments")).toBe(false);
    expect(perms.has("canViewMembers")).toBe(true);
  });

  it("does not grant business permission from legacy ADMIN without membership", () => {
    const permissions = resolveAccountPermissions(context(null, null));
    expect(permissions.size).toBe(0);
    expect(hasPermission({ user: { role: "ADMIN" } } as never, "canEditMembers")).toBe(false);
  });

  it("gives an assigned STAFF manager full account operations only for the current gym", () => {
    expect(hasCapability(permissionsFor("STAFF", "MANAGER"), "canEditMembers")).toBe(true);
  });

  it("gives a trainer assigned-member and workout access without finance permissions", () => {
    const permissions = permissionsFor("STAFF", "TRAINER");
    expect(hasCapability(permissions, "canViewAssignedMembers")).toBe(true);
    expect(hasCapability(permissions, "canViewAssignedWorkouts")).toBe(true);
    expect(hasCapability(permissions, "canPrescribeWorkouts")).toBe(true);
    expect(hasCapability(permissions, "canViewPayments")).toBe(false);
    expect(hasCapability(permissions, "canEditMembers")).toBe(false);
  });

  it("gives reception registration, attendance, and payment-entry capabilities only", () => {
    const permissions = permissionsFor("STAFF", "RECEPTION");
    expect(hasCapability(permissions, "canRegisterMembers")).toBe(true);
    expect(hasCapability(permissions, "canViewAttendance")).toBe(true);
    expect(hasCapability(permissions, "canManageAttendance")).toBe(true);
    expect(hasCapability(permissions, "canCreatePayments")).toBe(true);
    expect(hasCapability(permissions, "canEditMembers")).toBe(false);
    expect(hasCapability(permissions, "canEditPayments")).toBe(false);
    expect(hasCapability(permissions, "canViewAssignedMembers")).toBe(false);
  });
});

describe("agent scopes", () => {
  it("parses known scopes only", () => {
    expect(parseAgentScopes(["read:overdue", "nope"])).toEqual(["read:overdue"]);
  });

  it("enforces scope membership", () => {
    expect(agentHasScope(["read:members"], "read:overdue")).toBe(false);
    expect(agentHasScope(["read:overdue"], "read:overdue")).toBe(true);
  });

  it("normalizes requested scopes to allowed subset", () => {
    expect(
      normalizeRequestedScopes(["read:members", "write:reminders"], [
        "read:members",
        "read:overdue",
      ]),
    ).toEqual(["read:members"]);
  });
});
