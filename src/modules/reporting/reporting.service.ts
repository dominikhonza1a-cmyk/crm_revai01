import { and, eq, isNull, sql, lt, ne, inArray, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import type { TenantContext } from "@/shared";
import { deals, pipelineStages } from "@/modules/deals/deal.entity";
import { projects } from "@/modules/projects/project.entity";
import { tasks } from "@/modules/tasks/task.entity";
import { organizations } from "@/modules/organizations/organization.entity";
import { subscriptions } from "@/modules/subscriptions/subscription.entity";
import { czkRates, toCzkMinor } from "@/shared/fx";

/**
 * Read-only agregace pro dashboard widgety. Jediný (spolu s GDPR joby), kdo smí číst i soft-deleted řádky
 * — zde ale čteme jen aktivní (deleted_at IS NULL). Těžké agregace → materializované pohledy (fáze 3).
 */
export const reportingService = {
  /**
   * Finanční přehled: historicky vyděláno (won dealy), měsíční retainery (aktivní retainer
   * projekty), měsíční předplatná (aktivní, roční/12) — vše převedeno na CZK dle ČNB.
   * K tomu série vyděláno po měsících (posledních 12).
   */
  async finance() {
    const ws = currentWorkspaceId();
    const rates = await czkRates();

    // Historicky vyděláno = SKUTEČNĚ PŘIJATÉ platby z projektů (zálohy + doplatky, CZK)
    const projRows = await db().select({ payments: projects.payments })
      .from(projects).where(and(eq(projects.workspaceId, ws), isNull(projects.deletedAt)));
    let wonTotalCzkMinor = 0n;
    const byMonth = new Map<string, bigint>();
    for (const pr of projRows) {
      for (const pay of (pr.payments as { amountMinor: number; date: string }[]) ?? []) {
        const czk = BigInt(Math.round(pay.amountMinor));
        wonTotalCzkMinor += czk;
        const m = (pay.date ?? "").slice(0, 7) || new Date().toISOString().slice(0, 7);
        byMonth.set(m, (byMonth.get(m) ?? 0n) + czk);
      }
    }
    // Výdaje: fixní předplatná (aktuální stav, plošně) + jednorázové výdaje dle měsíce zaplacení
    const subRows = await db().select().from(subscriptions)
      .where(and(eq(subscriptions.workspaceId, ws), isNull(subscriptions.deletedAt)));
    let recurringMonthlyCzkMinor = 0n;
    const oneOffByMonth = new Map<string, bigint>();
    for (const su of subRows) {
      const czk = toCzkMinor(su.amountMinor, su.currency, rates);
      if (su.period === "one_off") {
        const m = (su.paidOn ?? su.createdAt.toISOString()).slice(0, 7);
        oneOffByMonth.set(m, (oneOffByMonth.get(m) ?? 0n) + czk);
      } else if (su.status === "active") {
        recurringMonthlyCzkMinor += su.period === "yearly" ? czk / 12n : czk;
      }
    }

    const months: { month: string; wonCzkMinor: bigint; expenseCzkMinor: bigint }[] = [];
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
      months.push({
        month: m,
        wonCzkMinor: byMonth.get(m) ?? 0n,
        expenseCzkMinor: recurringMonthlyCzkMinor + (oneOffByMonth.get(m) ?? 0n),
      });
    }
    const incomeThisMonth = byMonth.get(thisMonth) ?? 0n;
    const expenseThisMonth = recurringMonthlyCzkMinor + (oneOffByMonth.get(thisMonth) ?? 0n);

    // Měsíční retainery: jen projekty, kde retainer skutečně BĚŽÍ (retainer_active)
    const retainers = await db().select({ monthly: projects.monthlyAmountMinor })
      .from(projects)
      .where(and(eq(projects.workspaceId, ws), isNull(projects.deletedAt),
        eq(projects.engagementType, "retainer"), eq(projects.retainerActive, true),
        inArray(projects.status, ["active", "draft"])));
    const retainerMonthlyCzkMinor = retainers.reduce((a, r) => a + (r.monthly ?? 0n), 0n);
    // Cashflow měsíce = OPAKOVANÉ příjmy (běžící retainery) − výdaje měsíce.
    // Záměrně ne skutečné platby — historické jednorázovky by měsíc zkreslily.
    const cashflowMonthCzkMinor = retainerMonthlyCzkMinor - expenseThisMonth;

    const subsMonthlyCzkMinor = recurringMonthlyCzkMinor;

    return {
      wonTotalCzkMinor, retainerMonthlyCzkMinor, subsMonthlyCzkMinor, months,
      cashflowMonthCzkMinor, incomeThisMonthCzkMinor: incomeThisMonth, expenseThisMonthCzkMinor: expenseThisMonth,
      usdRate: rates.USD ?? null,
    };
  },

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

  /** Dnešní úkoly: po termínu + s termínem dnes (pro dashboard „Dnes"). */
  async todayTasks() {
    const ws = currentWorkspaceId();
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    return db().select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, priority: tasks.priority, type: tasks.type })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt),
        sql`${tasks.status} not in ('done','canceled')`, sql`${tasks.dueAt} is not null`, lt(tasks.dueAt, dayEnd)))
      .orderBy(tasks.dueAt).limit(8);
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
    const [pipeline, win, projStatus, overdue, tickets, revenue, mine, finance] = await Promise.all([
      this.pipelineValue(), this.winRate(), this.projectsStatus(), this.overdueTasks(),
      this.openTickets(), this.revenuePerClient(), ctx.userId ? this.myWork(ctx.userId) : Promise.resolve({ count: 0 }),
      this.finance(),
    ]);
    return { pipeline, win, projStatus, overdue, tickets, revenue, myWork: mine, finance };
  },
};
