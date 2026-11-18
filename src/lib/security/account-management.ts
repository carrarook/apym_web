import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";

/** Account management belongs to active OWNER/ADMIN memberships, never global User.role. */
export async function resolveAccountManagerAuthorization(
  session: Session,
  request: NextRequest,
): Promise<{ accountId: string; gymId: string } | null> {
  if (!session.user?.id) return null;
  const authorization = await resolveGymAuthorization(session.user.id, null, request);
  if (!authorization || !["OWNER", "ADMIN"].includes(authorization.accountMemberRole ?? "")) {
    return null;
  }
  return { accountId: authorization.accountId, gymId: authorization.gymId };
}
