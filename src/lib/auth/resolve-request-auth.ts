import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { readRequestedGymIdFromRequest } from "@/lib/gym-scope";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";
import { resolveBearerAccessToken } from "@/lib/oauth/tokens";
import type { AuthPrincipal, OAuthAuthPrincipal } from "@/lib/rbac/types";

function parseBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export async function resolveOAuthPrincipal(
  request: NextRequest,
): Promise<OAuthAuthPrincipal | null> {
  const bearer = parseBearer(request);
  if (!bearer) return null;

  const resolved = await resolveBearerAccessToken(bearer);
  if (!resolved) return null;

  const { token, client } = resolved;
  const kind = client.type === "AGENT" ? "agent_oauth" : "account_oauth";

  return {
    kind,
    clientType: client.type,
    clientId: client.clientId,
    accountId: token.accountId,
    gymId: token.gymId,
    scopes: token.scopes,
  };
}

export async function resolveSessionPrincipal(
  session: Session,
  request: NextRequest,
): Promise<AuthPrincipal | null> {
  const authorization = await resolveGymAuthorization(
    session.user.id,
    readRequestedGymIdFromRequest(request),
    request,
  );
  if (!authorization) return null;

  return {
    kind: "session",
    userId: session.user.id,
    userRole: session.user.role,
    accountMemberRole: authorization.accountMemberRole,
    gymStaffRole: authorization.gymStaffRole,
    userActive: authorization.userActive,
    accountId: authorization.accountId,
    gymId: authorization.gymId,
  };
}

/**
 * Session (NextAuth) or OAuth Bearer (account/agent client_credentials).
 */
export async function resolveRequestAuth(
  request: NextRequest,
): Promise<AuthPrincipal | null> {
  const oauth = await resolveOAuthPrincipal(request);
  if (oauth) return oauth;

  const session = await auth();
  if (!session?.user?.id) return null;
  return resolveSessionPrincipal(session, request);
}
