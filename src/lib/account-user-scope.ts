import { prisma } from "@/lib/prisma";
import {
  readRequestedAccountIdFromRequest,
  resolveAccountIdForUser,
} from "@/lib/account-scope";
import type { NextRequest } from "next/server";

/**
 * User ids visible through active persisted account memberships.
 */
export async function listUserIdsForAccount(accountId: string): Promise<string[]> {
  const memberships = await prisma.accountMembership.findMany({
    where: { accountId, isActive: true },
    select: { userId: true },
  });
  return [...new Set(memberships.map(({ userId }) => userId))];
}

export async function resolveAccountIdForRequest(
  userId: string,
  request?: NextRequest,
): Promise<string | null> {
  const preferred = request ? readRequestedAccountIdFromRequest(request) : null;
  return resolveAccountIdForUser(userId, preferred);
}

export async function userBelongsToAccount(
  targetUserId: string,
  accountId: string,
): Promise<boolean> {
  const ids = await listUserIdsForAccount(accountId);
  return ids.includes(targetUserId);
}
