import { GymStaffRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";

const assignmentSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(GymStaffRole),
  changeReason: z.string().trim().max(1000).optional(),
});

async function resolveManager(request: NextRequest, gymId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: ApiErrors.unauthorized() } as const;
  const authorization = await resolveGymAuthorization(session.user.id, gymId, request);
  if (!authorization || !["OWNER", "ADMIN"].includes(authorization.accountMemberRole ?? "")) {
    return { error: ApiErrors.forbidden("Account owner or admin access required") } as const;
  }
  return { session, authorization } as const;
}

export async function listGymStaff(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string }> },
) {
  const { gymId } = await params;
  const manager = await resolveManager(request, gymId);
  if ("error" in manager) return manager.error;

  const [memberships, assignments] = await Promise.all([
    prisma.accountMembership.findMany({
      where: { accountId: manager.authorization.accountId, isActive: true, User: { isActive: true } },
      select: { userId: true, role: true, User: { select: { id: true, name: true, email: true, contactNumber: true } } },
      orderBy: { User: { name: "asc" } },
    }),
    prisma.gymStaffAssignment.findMany({
      where: { accountId: manager.authorization.accountId, gymId, isActive: true },
      select: { id: true, userId: true, role: true, changeReason: true, createdAt: true, updatedAt: true },
    }),
  ]);
  const byUser = new Map(assignments.map((assignment) => [assignment.userId, assignment]));
  return NextResponse.json({
    gymId,
    staff: memberships.map(({ User, role }) => ({
      ...User,
      accountRole: role,
      assignment: byUser.get(User.id) ?? null,
    })),
  });
}

export async function assignGymStaff(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string }> },
) {
  const { gymId } = await params;
  const manager = await resolveManager(request, gymId);
  if ("error" in manager) return manager.error;
  const parsed = await parseJsonBody(request, assignmentSchema);
  if (!parsed.ok) return parsed.response;

  const targetMembership = await prisma.accountMembership.findUnique({
    where: { userId_accountId: { userId: parsed.data.userId, accountId: manager.authorization.accountId } },
    select: { isActive: true, role: true, User: { select: { isActive: true } } },
  });
  if (!targetMembership?.isActive || !targetMembership.User.isActive) {
    return ApiErrors.validationError("Target user must have an active membership in this account");
  }
  if (targetMembership.role !== "STAFF") {
    return ApiErrors.validationError("Operational roles can only be assigned to STAFF account members");
  }

  const current = await prisma.gymStaffAssignment.findFirst({
    where: { userId: parsed.data.userId, gymId, accountId: manager.authorization.accountId, isActive: true },
  });
  if (current?.isActive && current.role === parsed.data.role) {
    return NextResponse.json({ assignment: current, unchanged: true });
  }

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      if (current?.isActive) {
        await tx.gymStaffAssignment.update({
          where: { id: current.id },
          data: {
            isActive: false,
            deactivatedById: manager.session.user.id,
            deactivatedAt: new Date(),
            updatedById: manager.session.user.id,
          },
        });
      }
      return tx.gymStaffAssignment.create({
        data: {
          userId: parsed.data.userId,
          gymId,
          accountId: manager.authorization.accountId,
          role: parsed.data.role,
          assignedById: manager.session.user.id,
          changeReason: parsed.data.changeReason,
        },
      });
    });
    return NextResponse.json({ assignment, replacedAssignmentId: current?.isActive ? current.id : null, unchanged: false }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return ApiErrors.conflict("An active staff role already exists for this user and gym");
    }
    throw error;
  }
}
