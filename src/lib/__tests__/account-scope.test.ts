import { prisma } from "@/lib/prisma";
import { getAccountMemberRole, listAccountsForUser } from "@/lib/account-scope";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    accountMembership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    account: { findUnique: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  accountMembership: { findMany: jest.Mock; findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  account: { findUnique: jest.Mock };
};

describe("account scope membership fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not restore the same legacy account when its membership is inactive", async () => {
    mockedPrisma.accountMembership.findMany.mockResolvedValue([
      { isActive: false, Account: { id: "account-1", name: "APYM" } },
    ]);
    mockedPrisma.user.findUnique.mockResolvedValue({ accountId: "account-1" });

    await expect(listAccountsForUser("user-1")).resolves.toEqual([]);
    expect(mockedPrisma.account.findUnique).not.toHaveBeenCalled();
  });

  it("does not restore an inactive membership through the legacy role lookup", async () => {
    mockedPrisma.accountMembership.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: false,
    });

    await expect(getAccountMemberRole("user-1", "account-1")).resolves.toBeNull();
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("does not list a legacy account when the user has no AccountMembership", async () => {
    mockedPrisma.accountMembership.findMany.mockResolvedValue([]);
    mockedPrisma.user.findUnique.mockResolvedValue({ accountId: "account-legacy" });
    mockedPrisma.account.findUnique.mockResolvedValue({
      id: "account-legacy",
      name: "Legacy",
    });

    await expect(listAccountsForUser("user-1")).resolves.toEqual([]);
    expect(mockedPrisma.account.findUnique).not.toHaveBeenCalled();
  });

  it("does not derive an account role from User.role or User.accountId", async () => {
    mockedPrisma.accountMembership.findUnique.mockResolvedValue(null);
    mockedPrisma.user.findUnique.mockResolvedValue({
      accountId: "account-legacy",
      role: "ADMIN",
    });

    await expect(getAccountMemberRole("user-1", "account-legacy")).resolves.toBeNull();
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});
