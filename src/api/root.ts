import { router, publicProcedure, protectedProcedure } from "./trpc";
import { organizationsRouter } from "@/modules/organizations";
import { contactsRouter } from "@/modules/contacts";
import { dealsRouter } from "@/modules/deals";

/**
 * appRouter — skládá module routery. Fáze 0: health, me. Fáze 1: organizations, contacts, deals (CRM core).
 * Další moduly (projects, tasks, activities, …) se přidávají, jak vznikají.
 */
export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: new Date().toISOString() })),

  me: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
    email: ctx.email,
    roles: ctx.permissions.roleKeys,
    modules: ctx.permissions.modules,
  })),

  organizations: organizationsRouter,
  contacts: contactsRouter,
  deals: dealsRouter,

  // Fáze 1 pokr.: projects, tasks, activities, documents, reporting, security, integrations
});

export type AppRouter = typeof appRouter;
