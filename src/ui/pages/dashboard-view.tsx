import Link from "next/link";
import type { ReactNode } from "react";
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
}

function I({ d }: { d: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">{d}</svg>;
}

/** Prezentační dashboard — dostane data, nic nefetchuje (použito v /dashboard i pro náhledy). */
export function DashboardView({ data }: { data: DashboardData }) {
  const totalPipeline = data.pipeline.reduce((s, p) => s + Number(p.valueMinor), 0);
  const maxStage = Math.max(1, ...data.pipeline.map((p) => Number(p.valueMinor) || p.count));
  const totalProjects = data.projStatus.reduce((s, p) => s + p.count, 0);
  const donutSegs = data.projStatus.map((p) => ({ value: p.count, color: STATUS_COLOR[p.status] ?? "#5b6577", label: STATUS_LABEL[p.status] ?? p.status }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/tasks"><StatCard label="Moje práce" value={data.myWork.count} hint="otevřené úkoly" tone="accent" icon={<I d={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />} /></Link>
        <StatCard label="Win-rate" value={data.win.winRatePct != null ? `${data.win.winRatePct}%` : "—"} hint={`vyhráno ${data.win.won} · prohráno ${data.win.lost}`} tone="blue" icon={<I d={<><circle cx="12" cy="8" r="6" /><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" /></>} />} />
        <Link href="/tasks"><StatCard label="Po termínu" value={data.overdue.count} hint="overdue úkoly" tone="amber" icon={<I d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />} /></Link>
        <Link href="/deals"><StatCard label="Pipeline value" value={money(totalPipeline)} hint="otevřené dealy" tone="pink" icon={<I d={<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>} />} /></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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

        <Card>
          <SectionTitle>Stav projektů</SectionTitle>
          {totalProjects === 0 ? <Empty>Zatím žádné projekty</Empty> : (
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <Donut segments={donutSegs} />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center"><div className="text-2xl font-semibold text-ink">{totalProjects}</div><div className="text-xs text-faint">projektů</div></div>
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
        <Card>
          <SectionTitle>Otevřené tickety</SectionTitle>
          {data.tickets.length === 0 ? <Empty>Žádné otevřené tickety 🎉</Empty> : (
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

        <Card>
          <SectionTitle>Revenue / klient</SectionTitle>
          {data.revenue.length === 0 ? <Empty>Zatím žádné vyhrané dealy</Empty> : (
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
