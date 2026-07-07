import type { TenantContext } from "@/shared";
import { mergeRoles, type EffectivePermissions, type Module } from "@/domain/policies/permission.policy";
import type { PermissionLevel, RoleKey } from "@/domain/enums";
import { securityRepository } from "./security.repository";
import type { UserId } from "@/domain/ids";

/**
 * Use-casy modulu security: efektivní oprávnění, přiřazení role, deaktivace.
 * Efektivní práva = mergeRoles přes všechny role uživatele (domain policy).
 */
export interface SecurityService {
  effectivePermissions(userId: UserId): Promise<EffectivePermissions>;
  assignRole(ctx: TenantContext, userId: string, roleKey: string): Promise<void>;
  deactivateUser(ctx: TenantContext, userId: string): Promise<void>;
}

export const securityService: SecurityService = {
  async effectivePermissions(userId) {
    const dbRoles = await securityRepository.listRolesForUser(userId);
    return mergeRoles(
      dbRoles.map((r) => ({
        key: r.key as RoleKey,
        modules: r.permissions as unknown as Record<Module, PermissionLevel>,
        fieldPolicies: r.fieldPolicies as unknown as Record<string, "write" | "read" | "masked" | "hidden">,
        exports: r.exports,
      })),
    );
  },

  async assignRole(_ctx, _userId, _roleKey) {
    // insert user_role + audit.audited(ctx, "role_assigned", …)
    throw new Error("securityService.assignRole: fáze 1 (audit).");
  },

  async deactivateUser(_ctx, _userId) {
    // app_user.status=deactivated + authProvider.disableUser + audit user_deactivated + anonymizace (GDPR)
    throw new Error("securityService.deactivateUser: fáze 1.");
  },
};
