import type { NextRequest } from "next/server";
import type { AccountMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_COOKIE_NAME,
  ACCOUNT_HEADER_NAME,
} from "@/lib/account-constants";

export type AccountOption = {
  id: string;
  name: string;
  role: AccountMemberRole;
};

export function readRequestedAccountIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get(ACCOUNT_HEADER_NAME);
  if (header?.trim()) return header.trim();
  const cookie = request.cookies.get(ACCOUNT_COOKIE_NAME)?.value;
  if (cookie?.trim()) return cookie.trim();
  return null;
}

/** Accounts with an active persisted membership; legacy User.accountId is not authorization. */
export async function listAccountsForUser(userId: string): Promise<AccountOption[]> {
  const memberships = await prisma.accountMembership.findMany({
    where: { userId },
    include: { Account: { select: { id: true, name: true } } },
    orderBy: { Account: { name: "asc" } },
  });

  return memberships
    .filter((membership) => membership.isActive)
    .map((membership) => ({
      id: membership.Account.id,
      name: membership.Account.name,
      role: membership.role,
    }));
}

export async function resolveAccountIdForUser(
  userId: string,
  preferredAccountId: string | null | undefined,
): Promise<string | null> {
  const accounts = await listAccountsForUser(userId);
  if (accounts.length === 0) return null;
  if (preferredAccountId && accounts.some((a) => a.id === preferredAccountId)) {
    return preferredAccountId;
  }
  return accounts[0].id;
}

export async function getAccountMemberRole(
  userId: string,
  accountId: string,
): Promise<AccountMemberRole | null> {
  const membership = await prisma.accountMembership.findUnique({
    where: { userId_accountId: { userId, accountId } },
    select: { role: true, isActive: true },
  });
  if (membership) return membership.isActive ? membership.role : null;

  return null;
}

export async function userCanAccessAccount(
  userId: string,
  accountId: string,
): Promise<boolean> {
  const role = await getAccountMemberRole(userId, accountId);
  if (role === null) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  return user?.isActive === true;
}
