import { and, eq, isNull, sql, lt, ne, inArray, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import type { TenantContext } from "@/shared";
import { deals, pipelineStages } from "@/modules/deals/deal.entity";
import { projects } from "@/modules/projects/project.entity";
import { tasks } from "@/modules/tasks/task.entity";
import { organizations } from "@/modules/organizations/organization.entity";

/**
 * Read-only agregace pro dashboard widgety. Jediný (spolu s GDPR joby), kdo smí číst i soft-deleted řádky
 * — zde ale čteme jen aktivní (deleted_at IS NULL). Těžké agregace → materializované pohledy (fáze 3).
 */
export const reportingService = {
  /** Hodnota pipeline po fázích (jen otevřené fáze) + počet a suma. */
  async pipelineValue() {
    const ws = currentWorkspaceId();
    return db().select({
      stage: pipelineStages.name, position: pipelineStages.position,
      count: sql<number>`count(${deals.id})::int`,
      valueMinor: sql<string>`coalesce(sum(${deals.amountMinor}), 0)::text`,
    }).from(pipelineStages)
      .leftJoin(deals, and(eq(deals.pipelineStageId, pipelineStages.id), isNull(deals.deletedAt)))
      .where(and(eq(pipelineStages.workspaceId, ws), eq(pipelineStages.kind, "open")))
      .groupBy(pipelineStages.name, pipelineStages.position).orderBy(pipelineStages.position);
  },

  /** Win-rate = won / (won + lost). */
  async winRate() {
    const ws = currentWorkspaceId();
    const rows = await db().select({ kind: pipelineStages.kind, count: sql<number>`count(*)::int` })
      .from(deals).innerJoin(pipelineStages, eq(deals.pipelineStageId, pipelineStages.id))
      .where(and(eq(deals.workspaceId, ws), isNull(deals.deletedAt), inArray(pipelineStages.kind, ["won", "lost"])))
      .groupBy(pipelineStages.kind);
    const won = rows.find((r) => r.kind === "won")?.count ?? 0;
    const lost = rows.find((r) => r.kind === "lost")?.count ?? 0;
    return { won, lost, winRatePct: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null };
  },

  /** Počet projektů dle stavu. */
  async projectsStatus() {
    const ws = currentWorkspaceId();
    return db().select({ status: projects.status, count: sql<number>`count(*)::int` })
      .from(projects).where(and(eq(projects.workspaceId, ws), isNull(projects.deletedAt))).groupBy(projects.status);
  },

  /** Počet overdue tasků (po termínu, neuzavřené). */
  async overdueTasks() {
    const ws = currentWorkspaceId();
    const r = (await db().select({ n: sql<number>`count(*)::int` }).from(tasks)
      .where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt), lt(tasks.dueAt, new Date()),
        inArray(tasks.status, ["todo", "in_progress", "blocked", "waiting_on_client"]))))[0];
    return { count: r?.n ?? 0 };
  },

  /** Otevřené support tickety dle priority. */
  async openTickets() {
    const ws = currentWorkspaceId();
    return db().select({ priority: tasks.priority, count: sql<number>`count(*)::int` })
      .from(tasks).where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt), eq(tasks.type, "support"), ne(tasks.status, "done"), ne(tasks.status, "canceled")))
      .groupBy(tasks.priority);
  },

  /** Revenue per klient (suma won dealů), top N. */
  async revenuePerClient(limit = 5) {
    const ws = currentWorkspaceId();
    return db().select({
      organization: organizations.name,
      valueMinor: sql<string>`coalesce(sum(${deals.amountMinor}), 0)::text`,
    }).from(deals)
      .innerJoin(pipelineStages, eq(deals.pipelineStageId, pipelineStages.id))
      .innerJoin(organizations, eq(deals.organizationId, organizations.id))
      .where(and(eq(deals.workspaceId, ws), isNull(deals.deletedAt), eq(pipelineStages.kind, "won")))
      .groupBy(organizations.name).orderBy(desc(sql`sum(${deals.amountMinor})`)).limit(limit);
  },

  /** Moje práce — počet otevřených tasků přiřazených uživateli. */
  async myWork(userId: string) {
    const ws = currentWorkspaceId();
    const r = (await db().select({ n: sql<number>`count(*)::int` }).from(tasks)
      .where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt), eq(tasks.assigneeId, userId),
        inArray(tasks.status, ["todo", "in_progress", "blocked"]))))[0];
    return { count: r?.n ?? 0 };
  },

  /** Souhrn dashboardu — sada widgetů najednou. */
  async dashboard(ctx: TenantContext) {
    const [pipeline, win, projStatus, overdue, tickets, revenue, mine] = await Promise.all([
      this.pipelineValue(), this.winRate(), this.projectsStatus(), this.overdueTasks(),
      this.openTickets(), this.revenuePerClient(), ctx.userId ? this.myWork(ctx.userId) : Promise.resolve({ count: 0 }),
    ]);
    return { pipeline, win, projStatus, overdue, tickets, revenue, myWork: mine };
  },
};
