import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { appUsers, workspaces } from "@/modules/security/security.entity";
import { resolveAuthProvider } from "@/adapters/auth";
import { securityService } from "@/modules/security/security.service";
import type { EffectivePermissions } from "@/domain/policies/permission.policy";
import { asId, type WorkspaceId, type UserId } from "@/domain/ids";

export interface Context {
  workspaceId: WorkspaceId | null;
  userId: UserId | null;
  authUserId: string | null;
  email: string | null;
  permissions: EffectivePermissions | null;
  requestId: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Sestaví Context z HTTP requestu:
 *  1) vytáhne Supabase access token (Authorization: Bearer <jwt> nebo cookie),
 *  2) ověří ho přes AuthProvider (Supabase),
 *  3) najde app_user dle auth_user_id (při prvním loginu se napojí dle emailu),
 *  4) načte efektivní oprávnění (RBAC v naší app).
 * Neautentizovaný request má userId=null → protectedProcedure vrátí UNAUTHORIZED.
 */
export async function createContext(opts: {
  accessToken: string | null;
  requestId: string;
  ip?: string;
  userAgent?: string;
}): Promise<Context> {
  const base: Context = {
    workspaceId: null, userId: null, authUserId: null, email: null, permissions: null,
    requestId: opts.requestId, ip: opts.ip, userAgent: opts.userAgent,
  };
  if (!opts.accessToken) return base;

  const identity = await resolveAuthProvider().verifyToken(opts.accessToken);
  if (!identity) return base;

  const conn = db();
  // najdi app_user podle auth_user_id, jinak podle emailu (první login → napoj)
  let user = (await conn.select().from(appUsers).where(eq(appUsers.authUserId, identity.authUserId)).limit(1))[0];
  if (!user && identity.email) {
    user = (await conn.select().from(appUsers).where(eq(appUsers.email, identity.email)).limit(1))[0];
    if (user) await conn.update(appUsers).set({ authUserId: identity.authUserId, status: "active" }).where(eq(appUsers.id, user.id));
  }
  if (!user) return { ...base, authUserId: identity.authUserId, email: identity.email };

  const ws = (await conn.select().from(workspaces).where(eq(workspaces.id, user.workspaceId)).limit(1))[0];
  const permissions = await securityService.effectivePermissions(asId<UserId>(user.id));

  return {
    ...base,
    workspaceId: ws ? asId<WorkspaceId>(ws.id) : null,
    userId: asId<UserId>(user.id),
    authUserId: identity.authUserId,
    email: identity.email,
    permissions,
  };
}
