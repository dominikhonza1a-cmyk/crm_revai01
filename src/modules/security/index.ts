/**
 * Modul SECURITY — uživatelé, role, oprávnění, API klíče, audit (přes shared/audit).
 * Soubory: security.entity.ts (User, Role, user_role, ApiKey) · security.repository.ts ·
 *          security.service.ts (effectivePermissions, assignRole, deactivateUser) · security.router.ts.
 * Permission policy (čistá) je v domain/policies/permission.policy.ts; middleware v api/middleware.
 */
export { securityService } from "./security.service";
export { securityRepository } from "./security.repository";
export function registerModule(): void {}

export const SECURITY_ROUTER_NOTE = "security.{users,roles,assignRole,deactivateUser,apiKeys}; jen admin (settings:manage).";
