import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import permissions from "../../config/permissions.json" with { type: "json" };
import { db } from "@/shared/db";
import { roles, appUsers, userRoles } from "@/modules/security/security.entity";

/**
 * Seed 5 systémových rolí + permission matice. Zdroj = config/permissions.json (jeden zdroj pravdy).
 * Owner účty (00-tenant) dostanou roli `admin`. Idempotentní (upsert dle workspace+key).
 */
const ROLE_NAMES: Record<string, string> = {
  admin: "Admin", sales: "Sales", pm: "Projektový manažer", dev: "Vývojář", support: "Support",
};

export function buildRoleSeeds() {
  const keys = Object.keys(permissions.roles) as (keyof typeof permissions.roles)[];
  return keys.map((key) => ({
    key,
    name: ROLE_NAMES[key] ?? key,
    isSystem: true,
    permissions: permissions.roles[key],
    fieldPolicies: Object.fromEntries(
      Object.entries(permissions.fieldPolicies)
        .filter(([f]) => f !== "_comment")
        .map(([field, byRole]) => [field, (byRole as Record<string, string>)[key]]),
    ),
    exportPermissions: Object.entries(permissions.exportPermissions)
      .filter(([k]) => k !== "_comment")
      .filter(([, r]) => (r as string[]).includes(key))
      .map(([k]) => k),
  }));
}

export async function seedRoles(workspaceId: string): Promise<void> {
  const conn = db();
  const roleIdByKey = new Map<string, string>();

  for (const seed of buildRoleSeeds()) {
    const existing = (await conn.select({ id: roles.id }).from(roles)
      .where(and(eq(roles.workspaceId, workspaceId), eq(roles.key, seed.key))).limit(1))[0];
    if (existing) {
      await conn.update(roles).set({
        name: seed.name, permissions: seed.permissions, fieldPolicies: seed.fieldPolicies, exportPermissions: seed.exportPermissions,
      }).where(eq(roles.id, existing.id));
      roleIdByKey.set(seed.key, existing.id);
    } else {
      const id = randomUUID();
      await conn.insert(roles).values({ id, workspaceId, ...seed });
      roleIdByKey.set(seed.key, id);
    }
  }

  // owner účty → admin
  const adminId = roleIdByKey.get("admin")!;
  const owners = await conn.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.workspaceId, workspaceId));
  for (const o of owners) {
    const has = (await conn.select({ id: userRoles.id }).from(userRoles)
      .where(and(eq(userRoles.userId, o.id), eq(userRoles.roleId, adminId))).limit(1))[0];
    if (!has) await conn.insert(userRoles).values({ id: randomUUID(), workspaceId, userId: o.id, roleId: adminId });
  }
}
