import type { TenantContext } from "@/shared";
import { mergeRoles, type EffectivePermissions, type Module } from "@/domain/policies/permission.policy";
import type { PermissionLevel, RoleKey } from "@/domain/enums";
import { ValidationFailed } from "@/domain/errors";
import { audit } from "@/shared/audit/audit.service";
import { logger } from "@/shared/logger";
import { resolveAuthProvider } from "@/adapters/auth";
import { securityRepository } from "./security.repository";
import type { UserId } from "@/domain/ids";

/**
 * Use-casy modulu security: efektivní oprávnění, správa uživatelů (pozvání, role, deaktivace).
 * Autentizaci (heslo, MFA, pozvánkový e-mail) drží Supabase; my držíme profil + RBAC.
 */
export const securityService = {
  async effectivePermissions(userId: UserId): Promise<EffectivePermissions> {
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

  async listUsers(_ctx: TenantContext) {
    return securityRepository.listUsersWithRoles();
  },

  /**
   * Pozvání nového uživatele: app_user (invited) + role + pozvánkový e-mail přes Supabase
   * (uživatel se přes odkaz přihlásí; heslo si pak nastaví přes „zapomenuté heslo" nebo mu ho
   * admin založí v Supabase). sendInvite=false slouží testům.
   */
  async inviteUser(ctx: TenantContext, input: { email: string; fullName: string; roleKey: RoleKey; sendInvite?: boolean }): Promise<{ userId: string; inviteSent: boolean }> {
    const existing = await securityRepository.findUserByEmail(input.email);
    if (existing) throw new ValidationFailed(`Uživatel s e-mailem ${input.email} už existuje.`);

    const userId = await securityRepository.createUser(input.email, input.fullName);
    await securityRepository.setUserRole(userId, input.roleKey);
    await audit.audited(ctx, "role_assigned", { type: "user", id: userId }, { role: { from: null, to: input.roleKey } });

    let inviteSent = false;
    if (input.sendInvite !== false) {
      try {
        await resolveAuthProvider().inviteUser(input.email);
        inviteSent = true;
      } catch (err) {
        logger.warn("pozvánkový e-mail selhal (účet vytvořen, pozvat lze i ze Supabase)", { err: String(err) });
      }
    }
    return { userId, inviteSent };
  },

  async setRole(ctx: TenantContext, userId: string, roleKey: RoleKey): Promise<void> {
    if (ctx.userId === userId && roleKey !== "admin") {
      throw new ValidationFailed("Nemůžeš odebrat admin roli sám sobě.");
    }
    await securityRepository.setUserRole(userId, roleKey);
    await audit.audited(ctx, "role_assigned", { type: "user", id: userId }, { role: { from: "?", to: roleKey } });
  },

  async deactivateUser(ctx: TenantContext, userId: string): Promise<void> {
    if (ctx.userId === userId) throw new ValidationFailed("Nemůžeš deaktivovat sám sebe.");
    const user = await securityRepository.getUser(userId);
    if (!user) throw new ValidationFailed("Uživatel nenalezen.");
    await securityRepository.setUserStatus(userId, "deactivated");
    if (user.authUserId) {
      try { await resolveAuthProvider().disableUser(user.authUserId); }
      catch (err) { logger.warn("deaktivace v Supabase selhala (profil deaktivován)", { err: String(err) }); }
    }
    await audit.audited(ctx, "user_deactivated", { type: "user", id: userId });
  },
};
