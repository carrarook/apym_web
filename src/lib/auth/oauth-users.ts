import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeAuthEmail,
  provisionOwnerAccount,
} from "@/lib/auth/provision-owner";

export type OAuthProfile = {
  provider: string;
  providerUserId: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
};

export async function resolveOAuthUser(profile: OAuthProfile): Promise<User> {
  const provider = profile.provider.toLowerCase();
  const providerUserId = profile.providerUserId;

  const linked = await prisma.userAuthProvider.findUnique({
    where: {
      provider_providerUserId: { provider, providerUserId },
    },
    include: { User: true },
  });
  if (linked?.User.isActive) {
    return linked.User;
  }

  if (!profile.email || profile.emailVerified !== true) {
    throw new Error("A provider-verified email is required for a new OAuth identity");
  }
  const email = normalizeAuthEmail(profile.email);

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    if (!existingByEmail.isActive) {
      throw new Error("Account deactivated");
    }

    throw new Error("An account with this email already exists; sign in with its linked provider");
  }

  const user = await provisionOwnerAccount({
    email,
    name: profile.name?.trim() || email.split("@")[0] || "Owner",
  });

  await prisma.userAuthProvider.create({
    data: {
      userId: user.id,
      provider,
      providerUserId,
    },
  });

  return user;
}
