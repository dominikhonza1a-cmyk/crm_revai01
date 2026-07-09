import { router, publicProcedure, protectedProcedure } from "./trpc";
import { bootstrap } from "./bootstrap";
import { organizationsRouter } from "@/modules/organizations";
import { contactsRouter } from "@/modules/contacts";
import { dealsRouter } from "@/modules/deals";
import { projectsRouter } from "@/modules/projects";
import { activitiesRouter } from "@/modules/activities";
import { tasksRouter } from "@/modules/tasks";
import { documentsRouter } from "@/modules/documents";
import { reportingRouter } from "@/modules/reporting";
import { gdprRouter } from "@/shared/gdpr/gdpr.router";
import { securityRouter } from "@/modules/security/security.router";
import { integrationsRouter } from "@/modules/integrations/google/google.router";
import { tagsRouter } from "@/shared/tags/tag.router";
import { customFieldsRouter } from "@/shared/custom-fields/custom-field.router";
import { searchRouter } from "@/shared/search/search.router";
import { notificationsRouter } from "@/shared/notifications/notification.router";

// zaregistruje event subscribery (W2: deal.won → projekt) jednou při načtení
bootstrap();

/**
 * appRouter — skládá module routery. Fáze 1: CRM core + delivery core (projekty, timeline).
 * Další moduly (tasks, documents, reporting, …) se přidávají, jak vznikají.
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
  projects: projectsRouter,
  activities: activitiesRouter,
  tasks: tasksRouter,
  documents: documentsRouter,
  reporting: reportingRouter,
  gdpr: gdprRouter,
  security: securityRouter,
  integrations: integrationsRouter,
  tags: tagsRouter,
  customFields: customFieldsRouter,
  search: searchRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
