import { prisma } from "@/lib/prisma";
import { hasActiveTrainerDelegation } from "@/lib/security/trainer-delegation";
import { APYM_G2_TWO_GYM_FIXTURE as fixture } from "../../../prisma/fixtures/apym-g2-two-gym";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    gymStaffAssignment: { findFirst: jest.fn() },
    trainerClient: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
  },
}));

const db = prisma as unknown as {
  gymStaffAssignment: { findFirst: jest.Mock };
  trainerClient: { findFirst: jest.Mock };
  user: { findFirst: jest.Mock };
  member: { findFirst: jest.Mock };
};

describe("hasActiveTrainerDelegation", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");
  const input = {
    trainerId: fixture.users.staff.id,
    memberId: fixture.members.a.id,
    gymId: fixture.gyms.a.id,
    now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.gymStaffAssignment.findFirst.mockImplementation(async ({ where }: { where: { gymId: string } }) =>
      where.gymId === fixture.gyms.a.id ? { id: fixture.assignments.aTrainer } : null,
    );
    db.trainerClient.findFirst.mockImplementation(async ({ where }: { where: { gymId: string; memberId: string } }) =>
      where.gymId === fixture.gyms.a.id && where.memberId === fixture.members.a.id
        ? { id: fixture.trainerClient }
        : null,
    );
    db.user.findFirst.mockResolvedValue({ id: fixture.users.staff.id });
    db.member.findFirst.mockImplementation(async ({ where }: { where: { id: string; gymId: string } }) =>
      where.id === fixture.members.a.id && where.gymId === fixture.gyms.a.id
        ? { id: fixture.members.a.id }
        : null,
    );
  });

  it("requires an active trainer assignment and exact active delegation within the gym", async () => {
    await expect(hasActiveTrainerDelegation(input)).resolves.toBe(true);
    expect(db.gymStaffAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: input.trainerId, gymId: input.gymId, role: "TRAINER", isActive: true },
      select: { id: true },
    });
    expect(db.trainerClient.findFirst).toHaveBeenCalledWith({
      where: {
        trainerId: input.trainerId,
        memberId: input.memberId,
        gymId: input.gymId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { id: true },
    });
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: { id: input.trainerId, isActive: true },
      select: { id: true },
    });
    expect(db.member.findFirst).toHaveBeenCalledWith({
      where: { id: input.memberId, gymId: input.gymId, deletedAt: null },
      select: { id: true },
    });
  });

  it("denies when any delegation prerequisite is missing", async () => {
    for (const table of [db.gymStaffAssignment, db.trainerClient, db.user, db.member]) {
      table.findFirst.mockResolvedValueOnce(null);
      await expect(hasActiveTrainerDelegation(input)).resolves.toBe(false);
      jest.clearAllMocks();
      db.gymStaffAssignment.findFirst.mockResolvedValue({ id: "assignment-1" });
      db.trainerClient.findFirst.mockResolvedValue({ id: "delegation-1" });
      db.user.findFirst.mockResolvedValue({ id: "trainer-1" });
      db.member.findFirst.mockResolvedValue({ id: "member-1" });
    }
  });

  it("denies Gym B's member because the fixture delegates only Gym A's member", async () => {
    await expect(
      hasActiveTrainerDelegation({
        ...input,
        memberId: fixture.members.b.id,
        gymId: fixture.gyms.b.id,
      }),
    ).resolves.toBe(false);
  });
});
