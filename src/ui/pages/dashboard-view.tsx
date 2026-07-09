import Link from "next/link";
import { StatCard, Card, SectionTitle, Badge, Empty, Donut, money } from "@/ui/components/ui";

const STATUS_LABEL: Record<string, string> = { draft: "Draft", active: "Aktivní", on_hold: "Pozastavené", closed: "Uzavřené" };
const STATUS_COLOR: Record<string, string> = { draft: "#5b6577", active: "#34d399", on_hold: "#fbbf24", closed: "#64748b" };

export interface DashboardData {
  pipeline: { stage: string; position: number; count: number; valueMinor: string }[];
  win: { won: number; lost: number; winRatePct: number | null };
  projStatus: { status: string; count: number }[];
  overdue: { count: number };
  tickets: { priority: string; count: number }[];
  revenue: { organization: string; valueMinor: string }[];
  myWork: { count: number };
  finance: {
    wonTotalCzkMinor: bigint;
    retainerMonthlyCzkMinor: bigint;
    subsMonthlyCzkMinor: bigint;
    months: { month: string; wonCzkMinor: bigint }[];
    usdRate: number | null;
  };
}

const MONTH_SHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

/** Sloupcový graf „vyděláno po měsících" — čistý SVG bez knihoven. */
function MonthlyBars({ months }: { months: DashboardData["finance"]["months"] }) {
  const vals = months.map((m) => Number(m.wonCzkMinor));
  const max = Math.max(1, ...vals);
  return (
    <div className="flex h-36 items-end gap-1.5">
      {months.map((m, i) => {
        const [y, mo = ""] = m.month.split("-");
        const label = MONTH_SHORT[parseInt(mo, 10) - 1] ?? mo;
        const v = vals[i] ?? 0;
        const h = Math.max(3, (v / max) * 100);
        return (
          <div key={m.month} className="group flex flex-1 flex-col items-center gap-1" title={`${label} ${y}: ${money(v)}`}>
            <div className="w-full rounded-t-md bg-accent/80 transition-colors group-hover:bg-accent" style={{ height: `${h}%`, minHeight: v > 0 ? 6 : 3, opacity: v > 0 ? 1 : 0.25 }} />
            <span className="text-[10px] text-faint">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Prezentační dashboard — dostane data, nic nefetchuje (použito v /dashboard i pro náhledy). */
export function DashboardView({ data }: { data: DashboardData }) {
  const totalPipeline = data.pipeline.reduce((s, p) => s + Number(p.valueMinor), 0);
  const maxStage = Math.max(1, ...data.pipeline.map((p) => Number(p.valueMinor) || p.count));
  const totalProjects = data.projStatus.reduce((s, p) => s + p.count, 0);
  const donutSegs = data.projStatus.map((p) => ({ value: p.count, color: STATUS_COLOR[p.status] ?? "#5b6577", label: STATUS_LABEL[p.status] ?? p.status }));

  const fin = data.finance;
  const net = Number(fin.retainerMonthlyCzkMinor) - Number(fin.subsMonthlyCzkMinor);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Finance — historicky vyděláno, měsíční retainery, měsíční předplatná (náklady) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Historicky vyděláno" value={money(Number(fin.wonTotalCzkMinor))} hint="vyhrané dealy celkem" iconSrc="/doodles/safe.svg" />
        <StatCard label="Měsíční retainery" value={money(Number(fin.retainerMonthlyCzkMinor))} hint="aktivní retainer projekty / měsíc" iconSrc="/doodles/retainer.svg" />
        <Link href="/subscriptions"><StatCard label="Měsíční předplatná" value={money(Number(fin.subsMonthlyCzkMinor))} hint={`fixní náklady / měsíc${fin.usdRate ? ` · kurz $ ${fin.usdRate.toFixed(2)}` : ""}`} iconSrc="/doodles/card.svg" /></Link>
      </div>

      <Card>
        <SectionTitle right={<span className={`text-xs font-medium ${net >= 0 ? "text-accent" : "text-red-300"}`}>retainery − předplatná = {money(net)} /měs</span>}>
          Vyděláno po měsících (12 měsíců)
        </SectionTitle>
        <MonthlyBars months={fin.months} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/tasks"><StatCard label="Moje práce" value={data.myWork.count} hint="otevřené úkoly" iconSrc="/doodles/icon-tasks.png" /></Link>
        <StatCard label="Win-rate" value={data.win.winRatePct != null ? `${data.win.winRatePct}%` : "—"} hint={`vyhráno ${data.win.won} · prohráno ${data.win.lost}`} iconSrc="/doodles/icon-medal.png" doodle="/doodles/trophy.png" />
        <Link href="/tasks"><StatCard label="Po termínu" value={data.overdue.count} hint="overdue úkoly" iconSrc="/doodles/icon-clock.png" /></Link>
        <Link href="/deals"><StatCard label="Pipeline value" value={money(totalPipeline)} hint="otevřené dealy" iconSrc="/doodles/icon-coins.png" /></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 pb-14" doodle="/doodles/rocket.png" doodlePos="br">
          <SectionTitle right={<Link href="/deals" className="text-xs font-medium text-accent hover:underline">Otevřít pipeline →</Link>}>Pipeline po fázích</SectionTitle>
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
              <div className="relative shrink-0">
                <Donut segments={donutSegs} />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center"><div className="font-display text-3xl tracking-wide text-ink">{totalProjects}</div><div className="text-xs text-faint">projektů</div></div>
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
          {data.tickets.length === 0 ? <Empty doodle={null}>Žádné otevřené tickety 🎉</Empty> : (
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
