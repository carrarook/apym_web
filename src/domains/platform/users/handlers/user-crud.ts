import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { createLogger } from "@/lib/logger";
import {
  userBelongsToAccount,
} from "@/lib/account-user-scope";
import { resolveAccountManagerAuthorization } from "@/lib/security/account-management";

const logger = createLogger("platform-users");

export const updateUserBodySchema = z
  .object({
    contactNumber: z.string().optional(),
    password: z.string().optional(),
    name: z.string().optional(),
  })
  .strict();

async function requireAdminAccount(
  session: Session,
  request: NextRequest,
): Promise<string | NextResponse> {
  const manager = await resolveAccountManagerAuthorization(session, request);
  if (!manager) return ApiErrors.forbidden("Account owner or admin access required");
  return manager.accountId;
}

export async function getUserForAccount(
  session: Session,
  request: NextRequest,
  userId: string,
) {
  const accountId = await requireAdminAccount(session, request);
  if (accountId instanceof NextResponse) return accountId;

  if (!(await userBelongsToAccount(userId, accountId))) {
    return ApiErrors.notFound("User");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      contactNumber: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return ApiErrors.notFound("User");
  return NextResponse.json(user);
}

export async function updateUserForAccount(
  session: Session,
  request: NextRequest,
  userId: string,
  body: z.infer<typeof updateUserBodySchema>,
) {
  const accountId = await requireAdminAccount(session, request);
  if (accountId instanceof NextResponse) return accountId;

  if (!(await userBelongsToAccount(userId, accountId))) {
    return ApiErrors.notFound("User");
  }

  const { contactNumber, password, name } = body;
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) return ApiErrors.notFound("User");

  const memberships = await prisma.accountMembership.findMany({
    where: { userId },
    select: { accountId: true },
  });
  if (memberships.length !== 1 || memberships[0]?.accountId !== accountId) {
    return ApiErrors.forbidden("Shared global identities cannot be edited from one account");
  }

  if (contactNumber && contactNumber !== existingUser.contactNumber) {
    const contactTaken = await prisma.user.findUnique({
      where: { contactNumber },
    });
    if (contactTaken) {
      return ApiErrors.validationError("Contact number already in use");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (contactNumber) updateData.contactNumber = contactNumber;
  if (name) updateData.name = name;
  // User.role and User.isActive are global identity compatibility fields; staff
  // permissions and account access are managed through memberships/assignments.
  if (password) updateData.passwordHash = await hash(password, 12);

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      contactNumber: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function deleteUserForAccount(
  session: Session,
  request: NextRequest,
  userId: string,
) {
  const accountId = await requireAdminAccount(session, request);
  if (accountId instanceof NextResponse) return accountId;

  if (!(await userBelongsToAccount(userId, accountId))) {
    return ApiErrors.notFound("User");
  }

  if (userId === session.user?.id) {
    return ApiErrors.validationError("Cannot delete your own account");
  }

  const membership = await prisma.accountMembership.findUnique({
    where: { userId_accountId: { userId, accountId } },
    select: { role: true, isActive: true },
  });
  if (!membership) return ApiErrors.notFound("User");
  if (membership.role === "OWNER" || membership.role === "ADMIN") {
    return ApiErrors.validationError("Account owners and admins cannot be removed here");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.gymStaffAssignment.updateMany({
      where: { userId, accountId, isActive: true },
      data: {
        isActive: false,
        deactivatedById: session.user.id,
        deactivatedAt: now,
        updatedById: session.user.id,
      },
    }),
    prisma.accountMembership.update({
      where: { userId_accountId: { userId, accountId } },
      data: { isActive: false },
    }),
  ]);
  return NextResponse.json({ message: "Account access revoked" });
}

export function logUserRouteError(action: string, error: unknown) {
  logger.error(`Error ${action}:`, error as Error);
}
