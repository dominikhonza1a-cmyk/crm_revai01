import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { runWithTenant } from "@/shared/tenant-context";
import { can, type Module } from "@/domain/policies/permission.policy";
import type { PermissionLevel } from "@/domain/enums";
import type { Context } from "./context";

/**
 * tRPC init + procedury. Middleware řetěz: auth (protectedProcedure) → tenant-context → permission → audit.
 * superjson transformer řeší bigint (částky) a Date. Klient musí použít stejný transformer (ui/providers).
 */
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/** Vyžaduje přihlášeného uživatele + platný workspace; nastaví tenant-context (AsyncLocalStorage). */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.workspaceId || !ctx.permissions) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Přihlaste se." });
  }
  return runWithTenant(
    { workspaceId: ctx.workspaceId, userId: ctx.userId, requestId: ctx.requestId, ip: ctx.ip, userAgent: ctx.userAgent },
    () => next({ ctx: { ...ctx, userId: ctx.userId!, workspaceId: ctx.workspaceId!, permissions: ctx.permissions! } }),
  );
});

/**
 * Object-level guard (řetězí se za protectedProcedure). Field-level (hidden/masked) řeší service při serializaci.
 * Použití: `protectedProcedure.use(requirePermission("deals", "read"))`.
 */
export function requirePermission(module: Module, level: PermissionLevel) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.permissions || !can(ctx.permissions, module, level)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Chybí oprávnění: ${level} na ${module}.` });
    }
    return next();
  });
}

/** Mutační procedury, které se auditují (audit.middleware zapisuje přes shared/audit). Fáze 1. */
export const auditedProcedure = protectedProcedure;

export type { Context } from "./context";
export { createContext } from "./context";
