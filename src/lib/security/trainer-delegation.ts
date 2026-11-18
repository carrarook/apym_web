import { prisma } from "@/lib/prisma";

export interface ActiveTrainerDelegationInput {
  trainerId: string;
  memberId: string;
  gymId: string;
  now?: Date;
}

/** Verify the trainer's active gym role, user state, member tenancy and delegation window. */
export async function hasActiveTrainerDelegation({
  trainerId,
  memberId,
  gymId,
  now = new Date(),
}: ActiveTrainerDelegationInput): Promise<boolean> {
  const [assignment, delegation, trainer, member] = await Promise.all([
    prisma.gymStaffAssignment.findFirst({
      where: { userId: trainerId, gymId, role: "TRAINER", isActive: true },
      select: { id: true },
    }),
    prisma.trainerClient.findFirst({
      where: {
        trainerId,
        memberId,
        gymId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { id: trainerId, isActive: true },
      select: { id: true },
    }),
    prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  return Boolean(assignment && delegation && trainer && member);
}
