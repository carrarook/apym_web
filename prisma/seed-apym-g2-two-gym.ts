/**
 * Additive, idempotent APYM G2 test fixture. Not used by the default Prisma seed.
 * Execute only after explicit approval, after GymStaffAssignment migration, and
 * only against the expected development host with schema=gymkhana.
 */
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { APYM_G2_TWO_GYM_FIXTURE as fixture } from "./fixtures/apym-g2-two-gym";

type Tx = Prisma.TransactionClient;

function validateTarget(): void {
  if (process.env.APYM_G2_ENABLE_TEST_FIXTURE_SEED !== "I_CONFIRM_DEV_FIXTURE_WRITE") {
    throw new Error("Explicit APYM G2 fixture opt-in is required");
  }

  const rawUrl = process.env.DATABASE_URL;
  const expectedHost = process.env.APYM_G2_EXPECTED_DB_HOST;
  if (!rawUrl || !expectedHost) {
    throw new Error("DATABASE_URL and APYM_G2_EXPECTED_DB_HOST are required");
  }

  const url = new URL(rawUrl);
  if (url.searchParams.get("schema") !== "gymkhana") {
    throw new Error("Refusing to seed unless DATABASE_URL has schema=gymkhana");
  }
  if (url.hostname !== expectedHost) {
    throw new Error("Refusing to seed: database host does not match the explicit expected host");
  }
  if (url.pathname !== "/postgres") {
    throw new Error("Refusing to seed: unexpected database name");
  }
}

function assertMatch(label: string, matches: boolean): void {
  if (!matches) throw new Error(`Existing row conflicts with fixture: ${label}`);
}

async function ensureAccount(tx: Tx): Promise<void> {
  const row = await tx.account.findUnique({
    where: { id: fixture.account.id },
    select: { name: true },
  });
  if (row) {
    assertMatch("account", row.name === fixture.account.name);
    return;
  }
  await tx.account.create({ data: { ...fixture.account, plan: "FREE" } });
}

async function ensureUser(
  tx: Tx,
  user: (typeof fixture.users)[keyof typeof fixture.users],
): Promise<void> {
  const row = await tx.user.findUnique({
    where: { id: user.id },
    select: {
      contactNumber: true,
      name: true,
      role: true,
      accountId: true,
      isActive: true,
      isTrainer: true,
    },
  });
  if (row) {
    assertMatch(
      `user ${user.id}`,
      row.contactNumber === user.contactNumber &&
        row.name === user.name &&
        row.role === "SUB_ADMIN" &&
        row.accountId === null &&
        row.isActive &&
        !row.isTrainer,
    );
    return;
  }

  const contactOwner = await tx.user.findUnique({
    where: { contactNumber: user.contactNumber },
    select: { id: true },
  });
  assertMatch(`contact number for ${user.id} is unused`, !contactOwner);

  await tx.user.create({
    data: {
      id: user.id,
      accountId: null,
      contactNumber: user.contactNumber,
      name: user.name,
      role: "SUB_ADMIN",
      isActive: true,
      isTrainer: false,
      passwordHash: null,
    },
  });
}

async function ensureGym(
  tx: Tx,
  gym: (typeof fixture.gyms)[keyof typeof fixture.gyms],
): Promise<void> {
  const row = await tx.gym.findUnique({
    where: { id: gym.id },
    select: { accountId: true, name: true },
  });
  if (row) {
    assertMatch(
      `gym ${gym.id}`,
      row.accountId === fixture.account.id && row.name === gym.name,
    );
    return;
  }
  await tx.gym.create({
    data: { id: gym.id, accountId: fixture.account.id, name: gym.name },
  });
}

async function ensureMember(
  tx: Tx,
  gymId: string,
  member: (typeof fixture.members)[keyof typeof fixture.members],
): Promise<void> {
  const row = await tx.member.findUnique({
    where: { id: member.id },
    select: { gymId: true, name: true, phone: true, deletedAt: true },
  });
  if (row) {
    assertMatch(
      `member ${member.id}`,
      row.gymId === gymId &&
        row.name === member.name &&
        row.phone === member.phone &&
        row.deletedAt === null,
    );
    return;
  }
  await tx.member.create({
    data: { id: member.id, gymId, name: member.name, phone: member.phone },
  });
}

async function ensureMembership(
  tx: Tx,
  userId: string,
  role: "OWNER" | "STAFF",
): Promise<void> {
  const where = {
    userId_accountId: { userId, accountId: fixture.account.id },
  };
  const row = await tx.accountMembership.findUnique({
    where,
    select: { role: true, isActive: true },
  });
  if (row) {
    assertMatch(`membership ${userId}/${role}`, row.role === role && row.isActive);
    return;
  }
  await tx.accountMembership.create({
    data: { userId, accountId: fixture.account.id, role, isActive: true },
  });
}

async function ensureAssignment(
  tx: Tx,
  input: {
    id: string;
    gymId: string;
    role: "TRAINER" | "RECEPTION";
  },
): Promise<void> {
  const current = await tx.gymStaffAssignment.findUnique({
    where: { id: input.id },
    select: { userId: true, accountId: true, gymId: true, role: true, isActive: true },
  });
  if (current) {
    assertMatch(
      `assignment ${input.id}`,
      current.userId === fixture.users.staff.id &&
        current.accountId === fixture.account.id &&
        current.gymId === input.gymId &&
        current.role === input.role &&
        current.isActive,
    );
    return;
  }

  const conflictingActive = await tx.gymStaffAssignment.findFirst({
    where: {
      userId: fixture.users.staff.id,
      gymId: input.gymId,
      isActive: true,
    },
    select: { id: true },
  });
  assertMatch(`no pre-existing active assignment for ${input.gymId}`, !conflictingActive);

  await tx.gymStaffAssignment.create({
    data: {
      id: input.id,
      userId: fixture.users.staff.id,
      accountId: fixture.account.id,
      gymId: input.gymId,
      role: input.role,
      isActive: true,
      assignedById: fixture.users.manager.id,
      changeReason: "Synthetic APYM G2 two-gym authorization fixture",
    },
  });
}

async function ensureTrainerClient(tx: Tx): Promise<void> {
  const existing = await tx.trainerClient.findUnique({
    where: {
      trainerId_memberId: {
        trainerId: fixture.users.staff.id,
        memberId: fixture.members.a.id,
      },
    },
    select: { id: true, gymId: true, isActive: true, endDate: true },
  });
  if (existing) {
    assertMatch(
      "trainer delegation is active only for fixture Gym A member",
      existing.id === fixture.trainerClient &&
        existing.gymId === fixture.gyms.a.id &&
        existing.isActive &&
        (existing.endDate === null || existing.endDate >= new Date()),
    );
    return;
  }
  await tx.trainerClient.create({
    data: {
      id: fixture.trainerClient,
      trainerId: fixture.users.staff.id,
      memberId: fixture.members.a.id,
      gymId: fixture.gyms.a.id,
      startDate: new Date(Date.now() - 60_000),
      isActive: true,
    },
  });
}

async function main(): Promise<void> {
  validateTarget();
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      await ensureAccount(tx);
      await ensureUser(tx, fixture.users.manager);
      await ensureUser(tx, fixture.users.staff);
      await ensureGym(tx, fixture.gyms.a);
      await ensureGym(tx, fixture.gyms.b);
      await ensureMembership(tx, fixture.users.manager.id, "OWNER");
      await ensureMembership(tx, fixture.users.staff.id, "STAFF");
      await ensureMember(tx, fixture.gyms.a.id, fixture.members.a);
      await ensureMember(tx, fixture.gyms.b.id, fixture.members.b);
      await ensureAssignment(tx, {
        id: fixture.assignments.aTrainer,
        gymId: fixture.gyms.a.id,
        role: "TRAINER",
      });
      await ensureAssignment(tx, {
        id: fixture.assignments.bReception,
        gymId: fixture.gyms.b.id,
        role: "RECEPTION",
      });
      await ensureTrainerClient(tx);
    });
    console.log("Synthetic APYM G2 two-gym fixture is present.");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error("APYM G2 test fixture was not applied; inspect the local error securely.");
  process.exitCode = 1;
});
