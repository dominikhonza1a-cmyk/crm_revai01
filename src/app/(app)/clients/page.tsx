"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/ui/trpc";
import { Card, Loading, Empty, LifecycleBadge } from "@/ui/components/ui";
import { LIFECYCLE_META } from "@/domain/enums";

// pořadí stavů v obchodní cestě (pro seřazení a filtr)
const STAGE_ORDER = ["new_contact", "prospect", "meeting", "negotiating", "before_signature", "active_client", "on_hold", "past_client", "partner"];
const rank = (s: string) => { const i = STAGE_ORDER.indexOf(s); return i === -1 ? 99 : i; };

export default function ClientsPage() {
  const router = useRouter();
  const { data, isLoading, error } = trpc.organizations.list.useQuery(undefined);
  const [filter, setFilter] = useState<string>("all");
  if (error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;
  if (data.items.length === 0) return <Empty>Zatím žádní klienti. Přidej prvního přes „+ Nový".</Empty>;

  // počty per stav (jen ty, co reálně existují — filtr neukazuje prázdné)
  const counts = data.items.reduce((m, o) => { m[o.lifecycleStage] = (m[o.lifecycleStage] ?? 0) + 1; return m; }, {} as Record<string, number>);
  const presentStages = STAGE_ORDER.filter((s) => counts[s]);

  // filtr + seřazení dle stavu (stejné u sebe), pak dle názvu
  const rows = data.items
    .filter((o) => filter === "all" || o.lifecycleStage === filter)
    .sort((a, b) => rank(a.lifecycleStage) - rank(b.lifecycleStage) || a.name.localeCompare(b.name, "cs"));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Filtr stavů */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === "all" ? "bg-accent-strong text-[#08110c]" : "border border-line text-muted hover:text-ink"}`}>
          Vše <span className="opacity-70">{data.items.length}</span>
        </button>
        {presentStages.map((s) => {
          const meta = LIFECYCLE_META[s]!;
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              style={active
                ? { backgroundColor: meta.color, color: "#08110c" }
                : { backgroundColor: `${meta.color}22`, color: meta.color }}>
              {meta.label} <span className="opacity-70">{counts[s]}</span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-white/5 text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Název</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium">Odvětví</th>
              <th className="px-4 py-3 font-medium">Web</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => (
              <tr key={o.id} onClick={() => router.push(`/clients/${o.id}`)} className="cursor-pointer transition-colors hover:bg-white/5">
                <td className="px-4 py-3 font-medium text-ink">{o.name}</td>
                <td className="px-4 py-3"><LifecycleBadge stage={o.lifecycleStage} /></td>
                <td className="px-4 py-3 text-muted">{o.industry ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{o.website ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-6 text-center text-sm text-faint">Žádní klienti v tomto filtru</p>}
      </Card>
    </div>
  );
}
