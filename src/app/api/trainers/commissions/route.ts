import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const createCommissionSchema = z.object({
  trainerId: z.string().min(1),
  memberId: z.string().min(1),
  baseAmount: z.coerce.number().positive(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  notes: z.string().optional(),
});

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { updateCommissionSchema } from "@/domains/trainers/commission-validation";
import { resolveGymAuthorization, gymRequestHasPermission } from "@/lib/security/gym-authorization";
import { hasPermission } from "@/lib/permissions";

const logger = createLogger("api-trainers");

// Get trainer commissions
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const authorization = await resolveGymAuthorization(session.user.id, null, request);
    if (!authorization) return ApiErrors.forbidden("Active gym access required");
    const trainerView = hasPermission(authorization, "canViewAssignedMembers");
    if (!trainerView && !hasPermission(authorization, "canViewReports")) {
      return ApiErrors.forbidden("Commission access required");
    }
    const gymId = authorization.gymId;

    const searchParams = request.nextUrl.searchParams;
    const trainerId = searchParams.get('trainerId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const isPaid = searchParams.get('isPaid');

    const where: Prisma.TrainerCommissionWhereInput = { gymId };
    
    if (trainerView) {
      if (trainerId && trainerId !== session.user.id) return ApiErrors.forbidden();
      where.trainerId = session.user.id;
    } else if (trainerId) {
      where.trainerId = trainerId;
    }
    
    if (month) {
      const m = parseInt(month, 10);
      if (!Number.isNaN(m)) {
        where.month = m;
      }
    }

    if (year) {
      const y = parseInt(year, 10);
      if (!Number.isNaN(y)) {
        where.year = y;
      }
    }
    
    if (isPaid !== null && isPaid !== undefined) {
      where.isPaid = isPaid === 'true';
    }

    const commissions = await prisma.trainerCommission.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary
    const summary = {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
      paidAmount: commissions
        .filter(c => c.isPaid)
        .reduce((sum, c) => sum + Number(c.amount), 0),
      unpaidAmount: commissions
        .filter(c => !c.isPaid)
        .reduce((sum, c) => sum + Number(c.amount), 0),
    };

    return NextResponse.json({ commissions, summary });
  } catch (error) {
    if (error instanceof GymContextError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    logger.error('Error fetching commissions:', error as Error);
    return ApiErrors.internal("Failed to fetch commissions");
  }
}

// Create or calculate commission
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    if (!(await gymRequestHasPermission(session, request, "canEditPayments"))) {
      return ApiErrors.forbidden("Account manager access required");
    }
    const { gymId } = await getGymContext(request);

    const parsedBody = await parseJsonBody(request, createCommissionSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const { trainerId, memberId, baseAmount, month, year, notes } = parsedBody.data;

    const monthNum = month;
    const yearNum = year;

    // Get trainer's commission rate — scoped to the caller's account so a trainer
    // from another account/gym can't be referenced.
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { accountId: true },
    });
    const trainerAssignment = await prisma.gymStaffAssignment.findFirst({
      where: { userId: trainerId, gymId, accountId: gym?.accountId, role: "TRAINER", isActive: true },
      select: { id: true, AccountMembership: { select: { isActive: true } } },
    });
    const trainer = await prisma.user.findFirst({
      where: { id: trainerId, isActive: true },
      select: {
        id: true,
        name: true,
        commissionRate: true,
      },
    });

    if (!trainer || !trainerAssignment?.AccountMembership.isActive) {
      return ApiErrors.validationError("Invalid trainer");
    }

    if (!trainer.commissionRate) {
      return ApiErrors.validationError("Trainer commission rate not set");
    }

    const memberRow = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: { gymId: true },
    });
    if (!memberRow) {
      return ApiErrors.validationError("Invalid member");
    }

    // Calculate commission amount
    const commissionRate = Number(trainer.commissionRate);
    const amount = (Number(baseAmount) * commissionRate) / 100;

    // Create commission record
    const commission = await prisma.trainerCommission.create({
      data: {
        trainerId,
        memberId,
        gymId: memberRow.gymId,
        amount,
        commissionRate,
        baseAmount: Number(baseAmount),
        month: monthNum,
        year: yearNum,
        notes,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(commission, { status: 201 });
  } catch (error) {
    logger.error('Error creating commission:', error as Error);
    return ApiErrors.internal("Failed to create commission");
  }
}

// Mark commission as paid
export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    if (!(await gymRequestHasPermission(session, request, "canEditPayments"))) {
      return ApiErrors.forbidden("Account manager access required");
    }
    const { gymId } = await getGymContext(request);

    const parsedBody = await parseJsonBody(request, updateCommissionSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const { commissionId, isPaid } = parsedBody.data;

    const existing = await prisma.trainerCommission.findFirst({
      where: { id: commissionId, gymId },
    });
    if (!existing) {
      return ApiErrors.notFound("Commission");
    }

    const commission = await prisma.trainerCommission.update({
      where: { id: commissionId },
      data: {
        isPaid: isPaid ?? true,
        paidDate: isPaid ? new Date() : null,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(commission);
  } catch (error) {
    logger.error('Error updating commission:', error as Error);
    return ApiErrors.internal("Failed to update commission");
  }
}
