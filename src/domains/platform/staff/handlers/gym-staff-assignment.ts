import { GymStaffRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";

const updateSchema = z.object({
  role: z.nativeEnum(GymStaffRole),
  changeReason: z.string().trim().max(1000).optional(),
});

async function authorizeManager(request: NextRequest, gymId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: ApiErrors.unauthorized() } as const;
  const authorization = await resolveGymAuthorization(session.user.id, gymId, request);
  if (!authorization || !["OWNER", "ADMIN"].includes(authorization.accountMemberRole ?? "")) {
    return { error: ApiErrors.forbidden("Account owner or admin access required") } as const;
  }
  return { session, authorization } as const;
}

export async function updateGymStaffAssignment(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string; assignmentId: string }> },
) {
  const { gymId, assignmentId } = await params;
  const manager = await authorizeManager(request, gymId);
  if ("error" in manager) return manager.error;
  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) return parsed.response;

  const assignment = await prisma.gymStaffAssignment.findFirst({
    where: { id: assignmentId, gymId, accountId: manager.authorization.accountId },
  });
  if (!assignment) return ApiErrors.notFound("Staff assignment");

  const target = await prisma.accountMembership.findUnique({
    where: { userId_accountId: { userId: assignment.userId, accountId: manager.authorization.accountId } },
    select: { isActive: true, role: true, User: { select: { isActive: true } } },
  });
  if (!target?.isActive || !target.User.isActive) {
    return ApiErrors.validationError("Target user must have an active membership in this account");
  }
  if (target.role !== "STAFF") {
    return ApiErrors.validationError("Operational roles can only be assigned to STAFF account members");
  }

  if (assignment.isActive && assignment.role === parsed.data.role) {
    return NextResponse.json({ assignment, unchanged: true });
  }

  try {
    const replacement = await prisma.$transaction(async (tx) => {
      if (assignment.isActive) {
        await tx.gymStaffAssignment.update({
          where: { id: assignment.id },
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
          userId: assignment.userId,
          gymId,
          accountId: manager.authorization.accountId,
          role: parsed.data.role,
          assignedById: manager.session.user.id,
          changeReason: parsed.data.changeReason,
        },
      });
    });
    return NextResponse.json({ assignment: replacement, replacedAssignmentId: assignment.id, unchanged: false }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return ApiErrors.conflict("An active staff role already exists for this user and gym");
    }
    throw error;
  }
}

export async function revokeGymStaffAssignment(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string; assignmentId: string }> },
) {
  const { gymId, assignmentId } = await params;
  const manager = await authorizeManager(request, gymId);
  if ("error" in manager) return manager.error;
  const assignment = await prisma.gymStaffAssignment.findFirst({
    where: { id: assignmentId, gymId, accountId: manager.authorization.accountId },
  });
  if (!assignment) return ApiErrors.notFound("Staff assignment");
  if (!assignment.isActive) return NextResponse.json({ assignment, unchanged: true });

  const updated = await prisma.gymStaffAssignment.update({
    where: { id: assignment.id },
    data: {
      isActive: false,
      deactivatedById: manager.session.user.id,
      deactivatedAt: new Date(),
      updatedById: manager.session.user.id,
    },
  });
  return NextResponse.json({ assignment: updated, unchanged: false });
}
