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
    // Všechny nezávislé dotazy v jedné vlně (kurzy ČNB + platby + předplatná + retainery) —
    // ušetří ~2 round-tripy na Netlify→Supabase oproti sekvenčnímu awaitu.
    const [rates, projRows, subRows, retainers] = await Promise.all([
      czkRates(),
      db().select({ payments: projects.payments }).from(projects).where(and(eq(projects.workspaceId, ws), isNull(projects.deletedAt))),
      db().select().from(subscriptions).where(and(eq(subscriptions.workspaceId, ws), isNull(subscriptions.deletedAt))),
      db().select({ monthly: projects.monthlyAmountMinor }).from(projects).where(and(eq(projects.workspaceId, ws), isNull(projects.deletedAt),
        eq(projects.engagementType, "retainer"), eq(projects.retainerActive, true), inArray(projects.status, ["active", "draft"]))),
    ]);
    let wonTotalCzkMinor = 0n;
    const byMonth = new Map<string, bigint>();
    // rozpad příjmů: platba s poznámkou „retainer…" = retainer, jinak jednorázový příjem
    const retainerIncByMonth = new Map<string, bigint>();
    const oneOffIncByMonth = new Map<string, bigint>();
    for (const pr of projRows) {
      for (const pay of (pr.payments as { amountMinor: number; date: string; note?: string }[]) ?? []) {
        const czk = BigInt(Math.round(pay.amountMinor));
        wonTotalCzkMinor += czk;
        const m = (pay.date ?? "").slice(0, 7) || new Date().toISOString().slice(0, 7);
        byMonth.set(m, (byMonth.get(m) ?? 0n) + czk);
        const bucket = (pay.note ?? "").startsWith("retainer") ? retainerIncByMonth : oneOffIncByMonth;
        bucket.set(m, (bucket.get(m) ?? 0n) + czk);
      }
    }
    // Výdaje: fixní předplatná + jednorázové výdaje dle měsíce zaplacení.
    // Fixní náklad se do daného měsíce počítá jen pokud předplatné v tom měsíci UŽ EXISTOVALO
    // (dle created_at) — jinak by přidané předplatné retroaktivně zkreslilo historii grafu.
    let recurringMonthlyCzkMinor = 0n;
    const oneOffByMonth = new Map<string, bigint>();
    const recurringActive: { fromMonth: string; monthlyCzk: bigint }[] = [];
    for (const su of subRows) {
      const czk = toCzkMinor(su.amountMinor, su.currency, rates);
      if (su.period === "one_off") {
        const m = (su.paidOn ?? su.createdAt.toISOString()).slice(0, 7);
        oneOffByMonth.set(m, (oneOffByMonth.get(m) ?? 0n) + czk);
      } else if (su.status === "active") {
        const monthly = su.period === "yearly" ? czk / 12n : czk;
        recurringMonthlyCzkMinor += monthly;
        recurringActive.push({ fromMonth: su.createdAt.toISOString().slice(0, 7), monthlyCzk: monthly });
      }
    }
    // fixní náklady platné pro daný měsíc (jen ta předplatná, co už tehdy existovala)
    const recurringForMonth = (m: string) =>
      recurringActive.reduce((a, r) => a + (r.fromMonth <= m ? r.monthlyCzk : 0n), 0n);

    const months: { month: string; wonCzkMinor: bigint; expenseCzkMinor: bigint;
      retainerIncCzkMinor: bigint; oneOffIncCzkMinor: bigint; recurringExpCzkMinor: bigint; oneOffExpCzkMinor: bigint }[] = [];
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
      const recExp = recurringForMonth(m), oneExp = oneOffByMonth.get(m) ?? 0n;
      months.push({
        month: m,
        wonCzkMinor: byMonth.get(m) ?? 0n,
        expenseCzkMinor: recExp + oneExp,
        retainerIncCzkMinor: retainerIncByMonth.get(m) ?? 0n,
        oneOffIncCzkMinor: oneOffIncByMonth.get(m) ?? 0n,
        recurringExpCzkMinor: recExp,
        oneOffExpCzkMinor: oneExp,
      });
    }
    const incomeThisMonth = byMonth.get(thisMonth) ?? 0n;
    const expenseThisMonth = recurringMonthlyCzkMinor + (oneOffByMonth.get(thisMonth) ?? 0n);

    // Měsíční retainery: jen běžící (retainer_active) — načteno výše v jedné vlně.
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

  /** Aktivní (uzavření) klienti — historicky vyhraný byznys. */
  async activeClients() {
    const ws = currentWorkspaceId();
    const r = (await db().select({ n: sql<number>`count(*)::int` }).from(organizations)
      .where(and(eq(organizations.workspaceId, ws), isNull(organizations.deletedAt), eq(organizations.lifecycleStage, "active_client"))))[0];
    return { count: r?.n ?? 0 };
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

  /** Otevřené úkoly konkrétního uživatele (přiřazené jemu) — pro personalizovaný ranní souhrn. */
  async myOpenTasks(userId: string, now = new Date()) {
    const ws = currentWorkspaceId();
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    return db().select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, priority: tasks.priority, type: tasks.type })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt), eq(tasks.assigneeId, userId),
        inArray(tasks.status, ["todo", "in_progress", "blocked", "waiting_on_client"])))
      .orderBy(sql`${tasks.dueAt} asc nulls last`).limit(20);
  },

  /** Otevřené úkoly celého workspace (sdílené — 2 admini vidí vše). */
  async openTasks() {
    const ws = currentWorkspaceId();
    const r = (await db().select({ n: sql<number>`count(*)::int` }).from(tasks)
      .where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt),
        inArray(tasks.status, ["todo", "in_progress", "blocked", "waiting_on_client"]))))[0];
    return { count: r?.n ?? 0 };
  },

  /** Souhrn dashboardu — sada widgetů najednou. */
  async dashboard(_ctx: TenantContext) {
    const [pipeline, clients, projStatus, overdue, tickets, revenue, openTasks, finance] = await Promise.all([
      this.pipelineValue(), this.activeClients(), this.projectsStatus(), this.overdueTasks(),
      this.openTickets(), this.revenuePerClient(), this.openTasks(),
      this.finance(),
    ]);
    return { pipeline, activeClients: clients, projStatus, overdue, tickets, revenue, openTasks, finance };
  },
};
