import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { appUsers, roles, userRoles } from "./security.entity";

/** Repository security modulu. Čte role uživatele pro výpočet efektivních oprávnění. */
export interface SecurityRepository {
  listRolesForUser(userId: string): Promise<{ key: string; permissions: Record<string, string>; fieldPolicies: Record<string, string>; exports: string[] }[]>;
  findUserByEmail(email: string): Promise<{ id: string; workspaceId: string } | null>;
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

  async anonymizeUser(_userId) {
    // email → sha256 hash, full_name → "Deleted user", anonymized_at = now() (fáze 3, GDPR)
    throw new Error("securityRepository.anonymizeUser: fáze 3 (GDPR).");
  },
};
