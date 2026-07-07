"use client";

import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { StatCard, Card, SectionTitle, Badge, Loading, Empty, money } from "@/ui/components/ui";

const STATUS_LABEL: Record<string, string> = { draft: "Draft", active: "Aktivní", on_hold: "Pozastavené", closed: "Uzavřené" };

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.reporting.dashboard.useQuery();
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;

  const totalPipeline = data.pipeline.reduce((s, p) => s + Number(p.valueMinor), 0);
  const maxStage = Math.max(1, ...data.pipeline.map((p) => Number(p.valueMinor) || p.count));
  const totalProjects = data.projStatus.reduce((s, p) => s + p.count, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* KPI karty */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/tasks"><StatCard label="Moje práce" value={data.myWork.count} hint="otevřené úkoly" accent /></Link>
        <StatCard label="Win-rate" value={data.win.winRatePct != null ? `${data.win.winRatePct}%` : "—"} hint={`vyhráno ${data.win.won} · prohráno ${data.win.lost}`} />
        <Link href="/tasks"><StatCard label="Po termínu" value={data.overdue.count} hint="overdue úkoly" /></Link>
        <Link href="/deals"><StatCard label="Pipeline value" value={money(totalPipeline)} hint="otevřené dealy" /></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline po fázích */}
        <Card>
          <SectionTitle>Pipeline po fázích</SectionTitle>
          <div className="space-y-3">
            {data.pipeline.map((p) => (
              <div key={p.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{p.stage}</span>
                  <span className="text-slate-400">{p.count}× · {money(p.valueMinor)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.max(2, ((Number(p.valueMinor) || p.count) / maxStage) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stav projektů */}
        <Card>
          <SectionTitle>Stav projektů</SectionTitle>
          {totalProjects === 0 ? <Empty>Zatím žádné projekty</Empty> : (
            <div className="space-y-2">
              {data.projStatus.map((p) => (
                <div key={p.status} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                  <Badge tone={p.status === "active" ? "green" : p.status === "on_hold" ? "amber" : "slate"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                  <span className="text-lg font-semibold text-slate-800">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Otevřené tickety */}
        <Card>
          <SectionTitle>Otevřené tickety</SectionTitle>
          {data.tickets.length === 0 ? <Empty>Žádné otevřené tickety 🎉</Empty> : (
            <div className="space-y-2">
              {data.tickets.map((t) => (
                <div key={t.priority} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                  <Badge tone={t.priority === "p1" ? "red" : t.priority === "p2" ? "amber" : "slate"}>{t.priority.toUpperCase()}</Badge>
                  <span className="text-lg font-semibold text-slate-800">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Revenue / klient */}
        <Card>
          <SectionTitle>Revenue / klient</SectionTitle>
          {data.revenue.length === 0 ? <Empty>Zatím žádné vyhrané dealy</Empty> : (
            <div className="space-y-2">
              {data.revenue.map((r) => (
                <div key={r.organization} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                  <span className="truncate text-sm text-slate-600">{r.organization}</span>
                  <span className="font-medium text-slate-800">{money(r.valueMinor)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
