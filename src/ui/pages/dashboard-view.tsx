"use client";

import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { StatCard, Card, SectionTitle, Badge, Empty, Donut, money } from "@/ui/components/ui";

const STATUS_LABEL: Record<string, string> = { draft: "Draft", active: "Aktivní", on_hold: "Pozastavené", closed: "Uzavřené" };
const STATUS_COLOR: Record<string, string> = { draft: "#5b6577", active: "#34d399", on_hold: "#fbbf24", closed: "#64748b" };

type FinMonth = {
  month: string; wonCzkMinor: bigint; expenseCzkMinor: bigint;
  retainerIncCzkMinor: bigint; oneOffIncCzkMinor: bigint; recurringExpCzkMinor: bigint; oneOffExpCzkMinor: bigint;
};

export interface DashboardData {
  pipeline: { stage: string; position: number; count: number; valueMinor: string }[];
  activeClients: { count: number };
  projStatus: { status: string; count: number }[];
  overdue: { count: number };
  tickets: { priority: string; count: number }[];
  revenue: { organization: string; valueMinor: string }[];
  openTasks: { count: number };
  finance: {
    wonTotalCzkMinor: bigint;
    retainerMonthlyCzkMinor: bigint;
    subsMonthlyCzkMinor: bigint;
    cashflowMonthCzkMinor: bigint;
    incomeThisMonthCzkMinor: bigint;
    expenseThisMonthCzkMinor: bigint;
    months: FinMonth[];
    usdRate: number | null;
  };
}

const MONTH_SHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

// Barvy segmentů grafu (v našich tónech): 2× zelená pro příjmy, 2× červená pro výdaje.
const SEG = {
  retainer: "#34d399", oneOffInc: "#6ee7b7",       // mint / světlejší mint
  recurringExp: "#f87171", oneOffExp: "#fca5a5",    // červená / světlejší
};
const SEG_LABEL: Record<string, string> = {
  retainer: "Retainer", oneOffInc: "Jednorázové příjmy",
  recurringExp: "Pravidelné výdaje", oneOffExp: "Jednorázové výdaje",
};

/** Cashflow graf: skládané segmenty (příjmy nahoru, výdaje dolů) s hover rozpadem podle kategorií. */
function CashflowBars({ months }: { months: FinMonth[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = months.map((m) => ({
    inc: Number(m.wonCzkMinor), exp: Number(m.expenseCzkMinor),
    retainer: Number(m.retainerIncCzkMinor), oneOffInc: Number(m.oneOffIncCzkMinor),
    recurringExp: Number(m.recurringExpCzkMinor), oneOffExp: Number(m.oneOffExpCzkMinor),
  }));
  const max = Math.max(1, ...totals.map((t) => t.inc), ...totals.map((t) => t.exp));
  const seg = (v: number) => `${(v / max) * 100}%`;

  return (
    <div className="relative">
      <div className="flex items-stretch gap-1.5">
        {months.map((m, i) => {
          const [y, mo = ""] = m.month.split("-");
          const label = MONTH_SHORT[parseInt(mo, 10) - 1] ?? mo;
          const t = totals[i]!;
          const net = t.inc - t.exp;
          return (
            <div key={m.month} className="group relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))}>
              {/* příjmy nahoru (retainer dole, jednorázové nahoře) */}
              <div className="flex h-24 w-full flex-col-reverse overflow-hidden rounded-t-md" style={{ opacity: t.inc > 0 ? 1 : 0.25 }}>
                <div style={{ height: seg(t.retainer), background: SEG.retainer }} />
                <div style={{ height: seg(t.oneOffInc), background: SEG.oneOffInc }} />
                {t.inc === 0 && <div className="h-0.5 w-full bg-white/10" />}
              </div>
              <div className="my-0.5 h-px w-full bg-line" />
              {/* výdaje dolů */}
              <div className="flex h-24 w-full flex-col overflow-hidden rounded-b-md" style={{ opacity: t.exp > 0 ? 1 : 0.25 }}>
                <div style={{ height: seg(t.recurringExp), background: SEG.recurringExp }} />
                <div style={{ height: seg(t.oneOffExp), background: SEG.oneOffExp }} />
                {t.exp === 0 && <div className="h-0.5 w-full bg-white/10" />}
              </div>
              <span className={`mt-1 text-[10px] font-medium ${net > 0 ? "text-accent" : net < 0 ? "text-red-300" : "text-faint"}`}>{label}</span>

              {/* hover rozpad */}
              {hover === i && (t.inc > 0 || t.exp > 0) && (
                <div className="absolute -top-2 left-1/2 z-20 w-44 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface p-3 text-left shadow-xl shadow-black/40">
                  <div className="mb-1.5 font-display text-sm tracking-wide text-ink">{label} {y}</div>
                  {([["retainer", t.retainer], ["oneOffInc", t.oneOffInc], ["recurringExp", t.recurringExp], ["oneOffExp", t.oneOffExp]] as const)
                    .filter(([, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: SEG[k] }} />
                      <span className="flex-1 text-muted">{SEG_LABEL[k]}</span>
                      <span className="text-ink">{money(v)}</span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-xs">
                    <span className="text-faint">cashflow</span>
                    <span className={net >= 0 ? "text-accent" : "text-red-300"}>{net >= 0 ? "+" : ""}{money(net)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* legenda */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(SEG_LABEL) as (keyof typeof SEG)[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: SEG[k] }} />{SEG_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** „Dnes" — schůzky z MÉHO kalendáře (živě) + úkoly do dneška. Per-user blok. */
function TodayCard() {
  const agenda = trpc.integrations.todayAgenda.useQuery(undefined, { staleTime: 120_000 });
  const tasks = trpc.reporting.todayTasks.useQuery();
  const now = new Date();
  const time = (iso: string) => new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-faint">{now.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}</span>}>
        Dnes
      </SectionTitle>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">📅 Schůzky</h3>
          {agenda.error ? <p className="text-sm text-red-300">Kalendář se nepodařilo načíst — zkus <Link href="/settings" className="underline">připojit Google znovu</Link>.</p>
            : agenda.isLoading || !agenda.data ? <p className="text-sm text-faint">Načítám…</p>
            : !agenda.data.connected ? (
              <p className="text-sm text-faint">Google kalendář nepřipojen — <Link href="/settings" className="text-accent hover:underline">připojit v Nastavení</Link></p>
            ) : agenda.data.events.length === 0 ? (
              <p className="text-sm text-faint">Dnes žádné schůzky</p>
            ) : (
              <ul className="space-y-1.5">
                {agenda.data.events.map((e, i) => (
                  <li key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                    <span className="shrink-0 font-medium text-accent">{e.allDay ? "celý den" : time(e.start)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{e.summary}</span>
                    {e.meetLink && <a href={e.meetLink} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-accent hover:underline">Meet ↗</a>}
                  </li>
                ))}
              </ul>
            )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">✅ To-do</h3>
          {tasks.error ? <p className="text-sm text-red-300">Úkoly se nepodařilo načíst.</p>
            : tasks.isLoading || !tasks.data ? <p className="text-sm text-faint">Načítám…</p>
            : tasks.data.length === 0 ? <p className="text-sm text-faint">Žádné úkoly do dneška</p>
            : (
              <ul className="space-y-1.5">
                {tasks.data.map((t) => {
                  const overdue = t.dueAt && new Date(t.dueAt) < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <li key={t.id}>
                      <Link href="/tasks" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                        <Badge tone={overdue ? "red" : t.priority === "p1" ? "red" : t.priority === "p2" ? "amber" : "slate"}>
                          {overdue ? "po termínu" : t.priority.toUpperCase()}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                        {t.dueAt && <span className="shrink-0 text-xs text-faint">{new Date(t.dueAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
      </div>
    </Card>
  );
}

type Period = "month" | "quarter" | "year";
const PERIOD_LABEL: Record<Period, string> = { month: "Měsíc", quarter: "Kvartál", year: "Rok" };

/** Prezentační dashboard — dostane data, nic nefetchuje (použito v /dashboard i pro náhledy). */
export function DashboardView({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState<Period>("month");
  const totalPipeline = data.pipeline.reduce((s, p) => s + Number(p.valueMinor), 0);
  const maxStage = Math.max(1, ...data.pipeline.map((p) => Number(p.valueMinor) || p.count));
  const totalProjects = data.projStatus.reduce((s, p) => s + p.count, 0);
  const donutSegs = data.projStatus.map((p) => ({ value: p.count, color: STATUS_COLOR[p.status] ?? "#5b6577", label: STATUS_LABEL[p.status] ?? p.status }));

  const fin = data.finance;

  // Cashflow za zvolené období: příjmy = běžící retainery × počet měsíců (nemáme jejich historii),
  // výdaje = skutečný součet měsíčních výdajů z grafu (fixní dle platnosti + jednorázové).
  const nowD = new Date();
  const thisYear = nowD.getFullYear();
  const q = Math.floor(nowD.getMonth() / 3);
  const periodMonths: string[] = period === "month"
    ? [nowD.toISOString().slice(0, 7)]
    : period === "quarter"
      ? [0, 1, 2].map((i) => `${thisYear}-${String(q * 3 + i + 1).padStart(2, "0")}`)
      : Array.from({ length: 12 }, (_, i) => `${thisYear}-${String(i + 1).padStart(2, "0")}`);
  const nMonths = periodMonths.length;
  const periodIncome = Number(fin.retainerMonthlyCzkMinor) * nMonths;
  const periodExpense = fin.months
    .filter((m) => periodMonths.includes(m.month))
    .reduce((a, m) => a + Number(m.expenseCzkMinor), 0);
  const periodCashflow = periodIncome - periodExpense;
  const periodTitle = period === "month" ? "tento měsíc" : period === "quarter" ? `${q + 1}. kvartál` : `rok ${thisYear}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TodayCard />

      {/* Finance — vyděláno, retainery, náklady, cashflow měsíce */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Historicky vyděláno" value={money(Number(fin.wonTotalCzkMinor))} iconSrc="/doodles/safe.svg" />
        <StatCard label="Měsíční retainery" value={money(Number(fin.retainerMonthlyCzkMinor))} iconSrc="/doodles/retainer.svg" />
        <Link href="/subscriptions" className="block h-full"><StatCard label="Měsíční náklady" value={money(Number(fin.subsMonthlyCzkMinor))} hint={fin.usdRate ? `kurz $ ${fin.usdRate.toFixed(2)}` : undefined} iconSrc="/doodles/card.svg" /></Link>
        <StatCard label={`Cashflow — ${periodTitle}`} value={`${periodCashflow >= 0 ? "+" : ""}${money(periodCashflow)}`}
          iconSrc={periodCashflow >= 0 ? "/doodles/trophy.png" : "/doodles/icon-clock.png"} />
      </div>

      <Card>
        <SectionTitle right={
          <span className="inline-flex rounded-xl border border-line bg-surface p-0.5">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((k) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${period === k ? "bg-accent-strong text-[#08110c]" : "text-muted hover:text-ink"}`}>
                {PERIOD_LABEL[k]}
              </button>
            ))}
          </span>
        }>
          Cashflow po měsících
        </SectionTitle>
        <CashflowBars months={fin.months} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/tasks" className="block h-full"><StatCard label="Otevřené úkoly" value={data.openTasks.count} iconSrc="/doodles/icon-tasks.png" /></Link>
        <Link href="/clients" className="block h-full"><StatCard label="Aktivní klienti" value={data.activeClients.count} iconSrc="/doodles/icon-medal.png" doodle="/doodles/trophy.png" /></Link>
        <Link href="/tasks" className="block h-full"><StatCard label="Po termínu" value={data.overdue.count} iconSrc="/doodles/icon-clock.png" /></Link>
        <Link href="/deals" className="block h-full"><StatCard label="Hodnota obchodů" value={money(totalPipeline)} hint="otevřené dealy" iconSrc="/doodles/icon-coins.png" /></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle icon="/doodles/rocket.png" right={<Link href="/deals" className="text-xs font-medium text-accent hover:underline">Otevřít →</Link>}>Rozjednané obchody</SectionTitle>
          <div className="space-y-3.5">
            {data.pipeline.map((p) => (
              <div key={p.stage}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted">{p.stage}</span>
                  <span className="text-faint">{p.count}× · {money(p.valueMinor)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, ((Number(p.valueMinor) || p.count) / maxStage) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card doodle="/doodles/folder.png">
          <SectionTitle>Stav projektů</SectionTitle>
          {totalProjects === 0 ? <Empty>Zatím žádné projekty</Empty> : (
            <div className="flex items-center gap-5">
              <div className="relative grid shrink-0 place-items-center">
                <Donut segments={donutSegs} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl leading-none tracking-wide text-ink">{totalProjects}</span>
                  <span className="text-xs text-faint">projektů</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {data.projStatus.map((p) => (
                  <div key={p.status} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />
                    <span className="text-muted">{STATUS_LABEL[p.status] ?? p.status}</span>
                    <span className="ml-auto font-medium text-ink">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card doodle="/doodles/headset.png">
          <SectionTitle>Otevřené tickety</SectionTitle>
          {data.tickets.length === 0 ? <Empty doodle={null}>Žádné otevřené tickety</Empty> : (
            <div className="space-y-2">
              {data.tickets.map((t) => (
                <div key={t.priority} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
                  <Badge tone={t.priority === "p1" ? "red" : t.priority === "p2" ? "amber" : "slate"}>{t.priority.toUpperCase()}</Badge>
                  <span className="text-lg font-semibold text-ink">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card doodle="/doodles/chart.png">
          <SectionTitle>Revenue / klient</SectionTitle>
          {data.revenue.length === 0 ? <Empty doodle={null}>Zatím žádné vyhrané dealy</Empty> : (
            <div className="space-y-2">
              {data.revenue.map((r) => (
                <div key={r.organization} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
                  <span className="truncate text-sm text-muted">{r.organization}</span>
                  <span className="font-medium text-ink">{money(r.valueMinor)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
