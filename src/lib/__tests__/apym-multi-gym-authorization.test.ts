import { prisma } from "@/lib/prisma";
import { resolveAccountIdForUser } from "@/lib/account-scope";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";
import { hasPermission } from "@/lib/permissions";
import { APYM_G2_TWO_GYM_FIXTURE as fixture } from "../../../prisma/fixtures/apym-g2-two-gym";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    gym: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    accountMembership: { findUnique: jest.fn() },
    gymStaffAssignment: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/account-scope", () => ({
  resolveAccountIdForUser: jest.fn(),
  readRequestedAccountIdFromRequest: jest.fn(),
}));
jest.mock("@/lib/gym-scope", () => ({
  resolveGymIdForUser: jest.fn(),
  readRequestedGymIdFromRequest: jest.fn(),
}));

const db = prisma as unknown as {
  gym: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  accountMembership: { findUnique: jest.Mock };
  gymStaffAssignment: { findFirst: jest.Mock };
};

describe("two-academy authorization isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAccountIdForUser as jest.Mock).mockResolvedValue(fixture.account.id);
    db.user.findUnique.mockResolvedValue({ isActive: true });
    db.accountMembership.findUnique.mockResolvedValue({ role: "STAFF", isActive: true });
    db.gym.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      accountId: where.id === "gym-outside" ? "account-2" : fixture.account.id,
    }));
    db.gymStaffAssignment.findFirst.mockImplementation(async ({ where }: { where: { gymId: string } }) => ({
      role: where.gymId === fixture.gyms.a.id ? "TRAINER" : "RECEPTION",
    }));
  });

  it("resolves independent capabilities for one identity in two gyms", async () => {
    const trainerAtA = await resolveGymAuthorization(fixture.users.staff.id, fixture.gyms.a.id);
    const receptionAtB = await resolveGymAuthorization(fixture.users.staff.id, fixture.gyms.b.id);

    expect(hasPermission(trainerAtA, "canPrescribeWorkouts")).toBe(true);
    expect(hasPermission(trainerAtA, "canCreatePayments")).toBe(false);
    expect(hasPermission(receptionAtB, "canCreatePayments")).toBe(true);
    expect(hasPermission(receptionAtB, "canPrescribeWorkouts")).toBe(false);
  });

  it("denies a cross-account gym even when that gym id is explicitly requested", async () => {
    const authorization = await resolveGymAuthorization(fixture.users.staff.id, "gym-outside");
    expect(authorization).toBeNull();
    expect(db.accountMembership.findUnique).not.toHaveBeenCalled();
    expect(db.gymStaffAssignment.findFirst).not.toHaveBeenCalled();
  });
});
