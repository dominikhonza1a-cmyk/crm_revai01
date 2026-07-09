import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { appUsers, roles, userRoles } from "./security.entity";

/** Repository security modulu: role pro efektivní oprávnění + správa uživatelů (Nastavení). */
export interface SecurityRepository {
  listRolesForUser(userId: string): Promise<{ key: string; permissions: Record<string, string>; fieldPolicies: Record<string, string>; exports: string[] }[]>;
  findUserByEmail(email: string): Promise<{ id: string; workspaceId: string } | null>;
  listAdminUserIds(): Promise<string[]>;
  listUsersWithRoles(): Promise<{ id: string; email: string; fullName: string; status: string; lastLoginAt: Date | null; authUserId: string | null; roles: string[] }[]>;
  createUser(email: string, fullName: string): Promise<string>;
  setUserRole(userId: string, roleKey: string): Promise<void>;
  setUserStatus(userId: string, status: string): Promise<void>;
  getUser(userId: string): Promise<{ id: string; email: string; fullName: string; status: string; authUserId: string | null } | null>;
  deleteUserRow(userId: string): Promise<void>;
  anonymizeUser(userId: string): Promise<void>;
}

export const securityRepository: SecurityRepository = {
  async listRolesForUser(userId) {
    const rows = await db()
      .select({ key: roles.key, permissions: roles.permissions, fieldPolicies: roles.fieldPolicies, exports: roles.exportPermissions })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return rows.map((r) => ({
      key: r.key,
      permissions: (r.permissions ?? {}) as Record<string, string>,
      fieldPolicies: (r.fieldPolicies ?? {}) as Record<string, string>,
      exports: (r.exports ?? []) as string[],
    }));
  },

  async findUserByEmail(email) {
    const row = (await db().select({ id: appUsers.id, workspaceId: appUsers.workspaceId })
      .from(appUsers).where(and(eq(appUsers.email, email), isNull(appUsers.anonymizedAt))).limit(1))[0];
    return row ?? null;
  },

  /** ID uživatelů s rolí admin (příjemci eskalací a won dealů). */
  async listAdminUserIds() {
    const ws = currentWorkspaceId();
    const rows = await db().select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.workspaceId, ws), eq(roles.key, "admin")));
    return rows.map((r) => r.userId);
  },

  /** Seznam uživatelů workspace vč. rolí (pro Nastavení → Uživatelé). */
  async listUsersWithRoles() {
    const ws = currentWorkspaceId();
    const users = await db().select({
      id: appUsers.id, email: appUsers.email, fullName: appUsers.fullName,
      status: appUsers.status, lastLoginAt: appUsers.lastLoginAt, authUserId: appUsers.authUserId,
    }).from(appUsers).where(and(eq(appUsers.workspaceId, ws), isNull(appUsers.anonymizedAt)));
    const roleRows = await db().select({ userId: userRoles.userId, key: roles.key })
      .from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.workspaceId, ws));
    const byUser = new Map<string, string[]>();
    for (const r of roleRows) { const l = byUser.get(r.userId) ?? []; l.push(r.key); byUser.set(r.userId, l); }
    return users.map((u) => ({ ...u, roles: byUser.get(u.id) ?? [] }));
  },

  async createUser(email: string, fullName: string): Promise<string> {
    const ws = currentWorkspaceId();
    const id = crypto.randomUUID();
    await db().insert(appUsers).values({ id, workspaceId: ws, email, fullName, status: "invited" });
    return id;
  },

  /** Nastaví uživateli právě jednu roli (nahradí existující). */
  async setUserRole(userId: string, roleKey: string): Promise<void> {
    const ws = currentWorkspaceId();
    const role = (await db().select({ id: roles.id }).from(roles)
      .where(and(eq(roles.workspaceId, ws), eq(roles.key, roleKey))).limit(1))[0];
    if (!role) throw new Error(`Role '${roleKey}' neexistuje`);
    await db().delete(userRoles).where(and(eq(userRoles.workspaceId, ws), eq(userRoles.userId, userId)));
    await db().insert(userRoles).values({ id: crypto.randomUUID(), workspaceId: ws, userId, roleId: role.id });
  },

  async setUserStatus(userId: string, status: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(appUsers).set({ status, updatedAt: new Date() })
      .where(and(eq(appUsers.id, userId), eq(appUsers.workspaceId, ws)));
  },

  async getUser(userId: string) {
    const ws = currentWorkspaceId();
    return (await db().select().from(appUsers)
      .where(and(eq(appUsers.id, userId), eq(appUsers.workspaceId, ws))).limit(1))[0] ?? null;
  },

  /** Hard delete (jen pro úklid testovacích účtů bez auth vazby). */
  async deleteUserRow(userId: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().delete(userRoles).where(and(eq(userRoles.workspaceId, ws), eq(userRoles.userId, userId)));
    await db().delete(appUsers).where(and(eq(appUsers.id, userId), eq(appUsers.workspaceId, ws)));
  },

  async anonymizeUser(_userId) {
    // email → sha256 hash, full_name → "Deleted user", anonymized_at = now() (fáze 3, GDPR)
    throw new Error("securityRepository.anonymizeUser: fáze 3 (GDPR).");
  },
};
