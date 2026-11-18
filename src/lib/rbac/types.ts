import type {
  AccountMemberRole,
  GymStaffRole as PrismaGymStaffRole,
  OAuthClientType,
  Role,
} from "@prisma/client";
import type { Permission } from "@/lib/permissions";

export type AuthKind = "session" | "account_oauth" | "agent_oauth";

export type GymStaffRole = PrismaGymStaffRole;

export interface GymAuthorizationContext {
  userId: string;
  accountId: string;
  gymId: string;
  accountMemberRole: AccountMemberRole | null;
  gymStaffRole: GymStaffRole | null;
  userActive: boolean;
}

export interface SessionAuthPrincipal {
  kind: "session";
  userId: string;
  userRole: Role;
  accountMemberRole: AccountMemberRole | null;
  gymStaffRole: GymStaffRole | null;
  userActive: boolean;
  accountId: string | null;
  gymId: string | null;
}

export interface OAuthAuthPrincipal {
  kind: "account_oauth" | "agent_oauth";
  clientType: OAuthClientType;
  clientId: string;
  accountId: string;
  gymId: string | null;
  scopes: string[];
}

export type AuthPrincipal = SessionAuthPrincipal | OAuthAuthPrincipal;

export function isOAuthPrincipal(p: AuthPrincipal): p is OAuthAuthPrincipal {
  return p.kind === "account_oauth" || p.kind === "agent_oauth";
}

export type EffectivePermissionContext = GymAuthorizationContext;

export type PermissionCheck = Permission;
