import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { generateSecurePassword } from "@/lib/password-generator";
import { createLogger } from "@/lib/logger";
import {
  listUserIdsForAccount,
  resolveAccountIdForRequest,
} from "@/lib/account-user-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { resolveAccountManagerAuthorization } from "@/lib/security/account-management";

const logger = createLogger("api-users");

const mutatingBodySchema = z
  .object({
    contactNumber: z.string().optional(),
    name: z.string().optional(),
    password: z.string().optional(),
  })
  .strict();

export async function listUsersHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) return ApiErrors.unauthorized();
    const manager = await resolveAccountManagerAuthorization(session, request);
    if (!manager) return ApiErrors.forbidden("Account owner or admin access required");
    const accountId = manager.accountId;

    const userIds = await listUserIdsForAccount(accountId);
    if (userIds.length === 0) {
      return cachedJson([]);
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        contactNumber: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return cachedJson(users);
  } catch (error) {
    logger.error("Failed to fetch users", error as Error);
    return ApiErrors.internal("Failed to fetch users");
  }
}

export async function createUserHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) return ApiErrors.unauthorized();
    const manager = await resolveAccountManagerAuthorization(session, request);
    if (!manager) return ApiErrors.forbidden("Account owner or admin access required");
    const accountId = manager.accountId;

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as {
      contactNumber?: string;
      name?: string;
    };
    const { contactNumber, name } = body;

    if (!contactNumber || !name) {
      return ApiErrors.validationError("Contact number and name are required");
    }

    const existingUser = await prisma.user.findUnique({
      where: { contactNumber },
    });

    if (existingUser) {
      return ApiErrors.validationError("User with this contact number already exists");
    }

    const generatedPassword = generateSecurePassword();
    const passwordHash = await hash(generatedPassword, 12);

    logger.info("Creating new user with generated password", {
      contactNumber,
      name,
    });

    const user = await prisma.user.create({
      data: {
        contactNumber,
        passwordHash,
        mustChangePassword: true,
        name,
        isActive: true,
        accountId,
        AccountMembership: {
          create: {
            accountId,
            role: "STAFF",
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        contactNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("User created successfully", {
      userId: user.id,
      contactNumber: user.contactNumber,
    });

    return NextResponse.json(
      {
        ...user,
        temporaryPassword: generatedPassword,
        message: "User created. Share this password securely - it will only be shown once.",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating user:", error as Error);
    return ApiErrors.internal("Failed to create user");
  }
}
