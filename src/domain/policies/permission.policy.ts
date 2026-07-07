import type { PermissionLevel, RoleKey } from "../enums";
import { PermissionDenied } from "../errors";

/**
 * Vyhodnocení oprávnění. Čistá funkce nad efektivní rolí uživatele.
 * Zdroj matice: config/permissions.json → seed → Role.permissions/field_policies.
 */
export type Module =
  | "organizations" | "contacts" | "deals" | "projects" | "tasks"
  | "documents" | "reporting" | "settings" | "audit";

const ORDER: PermissionLevel[] = ["none", "read", "write", "manage"];
const rank = (l: PermissionLevel) => ORDER.indexOf(l);

export interface EffectivePermissions {
  modules: Record<Module, PermissionLevel>;         // max přes všechny role uživatele
  fieldPolicies: Record<string, "write" | "read" | "masked" | "hidden">;
  exports: string[];                                 // povolené export.* klíče
  roleKeys: RoleKey[];
}

/** Vrátí true, pokud efektivní úroveň modulu ≥ požadované. */
export function can(perm: EffectivePermissions, module: Module, needed: PermissionLevel): boolean {
  return rank(perm.modules[module]) >= rank(needed);
}

export function assertCan(perm: EffectivePermissions, module: Module, needed: PermissionLevel): void {
  if (!can(perm, module, needed)) throw new PermissionDenied(needed, module);
}

/** Jak zacházet s polem (hidden = vynechat z odpovědi, masked = zamaskovat). */
export function fieldAccess(perm: EffectivePermissions, fieldGroup: string): "write" | "read" | "masked" | "hidden" {
  return perm.fieldPolicies[fieldGroup] ?? "write";
}

export function canExport(perm: EffectivePermissions, exportKey: string): boolean {
  return perm.exports.includes(exportKey);
}

/** Sloučení více rolí do efektivních práv (max úroveň, „nejotevřenější" field policy prohrává s nejpřísnější). */
export function mergeRoles(
  roles: { key: RoleKey; modules: Record<Module, PermissionLevel>; fieldPolicies: Record<string, "write" | "read" | "masked" | "hidden">; exports: string[] }[],
): EffectivePermissions {
  const modules = {} as Record<Module, PermissionLevel>;
  const fieldPolicies: Record<string, "write" | "read" | "masked" | "hidden"> = {};
  const exports = new Set<string>();
  const fieldRank = { hidden: 0, masked: 1, read: 2, write: 3 } as const;
  for (const r of roles) {
    for (const m of Object.keys(r.modules) as Module[]) {
      modules[m] = !modules[m] || rank(r.modules[m]) > rank(modules[m]) ? r.modules[m] : modules[m];
    }
    for (const [f, v] of Object.entries(r.fieldPolicies)) {
      // efektivní pole = NEJVYŠŠÍ dostupný přístup napříč rolemi (uživatel s víc rolemi má součet práv)
      if (!fieldPolicies[f] || fieldRank[v] > fieldRank[fieldPolicies[f]]) fieldPolicies[f] = v;
    }
    r.exports.forEach((e) => exports.add(e));
  }
  return { modules, fieldPolicies, exports: [...exports], roleKeys: roles.map((r) => r.key) };
}
