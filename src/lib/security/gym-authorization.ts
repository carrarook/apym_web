import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  readRequestedAccountIdFromRequest,
  resolveAccountIdForUser,
} from "@/lib/account-scope";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import type { GymAuthorizationContext } from "@/lib/rbac/types";
import type { Session } from "next-auth";
import type { Permission } from "@/lib/permissions";
import { requirePermission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

export async function requireGymPermissionForRequest(
  session: Session,
  request: NextRequest,
  permission: Permission,
): Promise<GymAuthorizationContext> {
  if (!session.user?.id) throw new Error("Authenticated user required");
  const context = await resolveGymAuthorization(session.user.id, null, request);
  if (!context) {
    requirePermission(null, permission);
    throw new Error("Unreachable authorization state");
  }
  requirePermission(context, permission);
  return context;
}

export async function gymRequestHasPermission(
  session: Session,
  request: NextRequest,
  permission: Permission,
): Promise<boolean> {
  if (!session.user?.id) return false;
  const context = await resolveGymAuthorization(session.user.id, null, request);
  return hasPermission(context, permission);
}

export async function resolveGymAuthorization(
  userId: string,
  requestedGymId: string | null,
  request?: NextRequest,
): Promise<GymAuthorizationContext | null> {
  const requestedAccountId = request ? readRequestedAccountIdFromRequest(request) : null;
  const accountId = await resolveAccountIdForUser(userId, requestedAccountId);
  if (!accountId || (requestedAccountId && requestedAccountId !== accountId)) return null;

  const requestedGym = requestedGymId ?? (request ? readRequestedGymIdFromRequest(request) : null);
  const gymId = requestedGym ?? await resolveGymIdForUser(userId, null, request);
  if (!gymId) return null;

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, accountId: true },
  });
  if (!gym || gym.accountId !== accountId) return null;

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    }),
    prisma.accountMembership.findUnique({
      where: { userId_accountId: { userId, accountId } },
      select: { role: true, isActive: true },
    }),
  ]);
  if (!user?.isActive || !membership?.isActive) return null;

  let gymStaffRole: GymAuthorizationContext["gymStaffRole"] = null;
  if (membership.role === "STAFF") {
    const assignment = await prisma.gymStaffAssignment.findFirst({
      where: { userId, gymId, accountId, isActive: true },
      select: { role: true },
    });
    if (!assignment) return null;
    gymStaffRole = assignment.role;
  }

  return {
    userId,
    accountId,
    gymId,
    accountMemberRole: membership.role,
    gymStaffRole,
    userActive: user.isActive,
  };
}
