import { prisma } from "@/lib/prisma";
import { provisionOwnerAccount } from "@/lib/auth/provision-owner";
import { resolveOAuthUser } from "@/lib/auth/oauth-users";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userAuthProvider: { findUnique: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/auth/provision-owner", () => ({
  normalizeAuthEmail: (email: string) => email.trim().toLowerCase(),
  provisionOwnerAccount: jest.fn(),
}));

const db = prisma as unknown as {
  userAuthProvider: { findUnique: jest.Mock; create: jest.Mock };
  user: { findUnique: jest.Mock };
};

describe("resolveOAuthUser safe linking", () => {
  beforeEach(() => jest.clearAllMocks());

  it("continues to authenticate an already linked provider identity", async () => {
    const user = { id: "user-1", isActive: true };
    db.userAuthProvider.findUnique.mockResolvedValue({ User: user });
    await expect(resolveOAuthUser({ provider: "google", providerUserId: "sub-1" }))
      .resolves.toBe(user);
  });

  it("denies email collisions without linking by email", async () => {
    db.userAuthProvider.findUnique.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue({ id: "user-existing", isActive: true });
    await expect(resolveOAuthUser({
      provider: "google", providerUserId: "sub-new", email: "same@example.com", emailVerified: true,
    })).rejects.toThrow(/already exists/i);
    expect(db.userAuthProvider.create).not.toHaveBeenCalled();
  });

  it("provisions a new account only when the provider verified the email", async () => {
    db.userAuthProvider.findUnique.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
    const user = { id: "new-user", isActive: true };
    (provisionOwnerAccount as jest.Mock).mockResolvedValue(user);
    db.userAuthProvider.create.mockResolvedValue({});
    await expect(resolveOAuthUser({
      provider: "google", providerUserId: "sub-new", email: "new@example.com", emailVerified: true, name: "New",
    })).resolves.toBe(user);
    expect(db.userAuthProvider.create).toHaveBeenCalledWith({ data: {
      userId: "new-user", provider: "google", providerUserId: "sub-new",
    } });
  });

  it("rejects new OAuth identities without a verified email", async () => {
    db.userAuthProvider.findUnique.mockResolvedValue(null);
    await expect(resolveOAuthUser({
      provider: "google", providerUserId: "sub-new", email: "new@example.com", emailVerified: false,
    })).rejects.toThrow(/verified email/i);
    expect(provisionOwnerAccount).not.toHaveBeenCalled();
  });
});
