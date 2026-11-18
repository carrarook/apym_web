import { prisma } from "@/lib/prisma";
import { resolveAccountIdForUser } from "@/lib/account-scope";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";

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
const resolveAccount = resolveAccountIdForUser as jest.Mock;

describe("resolveGymAuthorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAccount.mockResolvedValue("account-1");
    db.gym.findUnique.mockResolvedValue({ id: "gym-a", accountId: "account-1" });
    db.user.findUnique.mockResolvedValue({ isActive: true });
    db.accountMembership.findUnique.mockResolvedValue({ role: "STAFF", isActive: true });
    db.gymStaffAssignment.findFirst.mockResolvedValue({ role: "TRAINER" });
  });

  it("returns the active per-gym role and validates the account tuple", async () => {
    await expect(resolveGymAuthorization("user-1", "gym-a")).resolves.toEqual({
      userId: "user-1",
      accountId: "account-1",
      gymId: "gym-a",
      accountMemberRole: "STAFF",
      gymStaffRole: "TRAINER",
      userActive: true,
    });
    expect(db.gymStaffAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", gymId: "gym-a", accountId: "account-1", isActive: true },
      select: { role: true },
    });
  });

  it("denies a STAFF user without an assignment even when isTrainer is true", async () => {
    db.user.findUnique.mockResolvedValue({ isActive: true, isTrainer: true });
    db.gymStaffAssignment.findFirst.mockResolvedValue(null);

    await expect(resolveGymAuthorization("user-1", "gym-a")).resolves.toBeNull();
  });

  it("denies inactive users and missing or inactive account memberships", async () => {
    db.user.findUnique.mockResolvedValue({ isActive: false });
    await expect(resolveGymAuthorization("user-1", "gym-a")).resolves.toBeNull();

    db.user.findUnique.mockResolvedValue({ isActive: true });
    db.accountMembership.findUnique.mockResolvedValue(null);
    await expect(resolveGymAuthorization("user-1", "gym-a")).resolves.toBeNull();

    db.accountMembership.findUnique.mockResolvedValue({ role: "STAFF", isActive: false });
    await expect(resolveGymAuthorization("user-1", "gym-a")).resolves.toBeNull();
  });

  it("denies a gym whose account does not match the selected membership account", async () => {
    db.gym.findUnique.mockResolvedValue({ id: "gym-b", accountId: "account-2" });

    await expect(resolveGymAuthorization("user-1", "gym-b")).resolves.toBeNull();
    expect(db.accountMembership.findUnique).not.toHaveBeenCalled();
  });

  it("does not require a gym assignment for active account OWNER or ADMIN", async () => {
    db.accountMembership.findUnique.mockResolvedValue({ role: "OWNER", isActive: true });

    await expect(resolveGymAuthorization("user-1", "gym-a")).resolves.toMatchObject({
      accountMemberRole: "OWNER",
      gymStaffRole: null,
    });
    expect(db.gymStaffAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("resolves independent staff roles for two gyms in the same account", async () => {
    db.gym.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      accountId: "account-1",
    }));
    db.gymStaffAssignment.findFirst.mockImplementation(async ({ where }: { where: { gymId: string } }) => ({
      role: where.gymId === "gym-a" ? "TRAINER" : "RECEPTION",
    }));

    const gymA = await resolveGymAuthorization("user-1", "gym-a");
    const gymB = await resolveGymAuthorization("user-1", "gym-b");

    expect(gymA).toMatchObject({ gymId: "gym-a", gymStaffRole: "TRAINER" });
    expect(gymB).toMatchObject({ gymId: "gym-b", gymStaffRole: "RECEPTION" });
    expect(db.gymStaffAssignment.findFirst).toHaveBeenNthCalledWith(1, {
      where: { userId: "user-1", gymId: "gym-a", accountId: "account-1", isActive: true },
      select: { role: true },
    });
    expect(db.gymStaffAssignment.findFirst).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", gymId: "gym-b", accountId: "account-1", isActive: true },
      select: { role: true },
    });
  });
});
