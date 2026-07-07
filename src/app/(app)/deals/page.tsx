"use client";

import { trpc } from "@/ui/trpc";
import { Loading, Empty, money } from "@/ui/components/ui";

/** Obchod — kanban pipeline. Sloupce = fáze, karty = dealy. Drag & drop doplníme v dalším kole. */
export default function DealsPage() {
  const stages = trpc.deals.stages.useQuery();
  const deals = trpc.deals.list.useQuery(undefined);

  if (stages.error || deals.error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {(stages.error ?? deals.error)?.message}</div>;
  if (stages.isLoading || deals.isLoading || !stages.data || !deals.data) return <Loading />;

  const open = stages.data.filter((s) => s.kind === "open");
  const byStage = (stageId: string) => deals.data!.items.filter((d) => d.pipelineStageId === stageId);
  if (deals.data.items.length === 0) return <Empty>Zatím žádné dealy. Přidej první přes „+ Nový".</Empty>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {open.map((s) => {
        const items = byStage(s.id);
        const sum = items.reduce((a, d) => a + Number(d.amountMinor ?? 0), 0);
        return (
          <div key={s.id} className="flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-surface/50 p-2.5">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold text-ink">{s.name}</span>
              <span className="text-xs text-faint">{items.length} · {money(sum)}</span>
            </div>
            <div className="space-y-2">
              {items.map((d) => (
                <div key={d.id} className="cursor-pointer rounded-xl border border-line bg-surface p-3 transition-colors hover:border-accent/40">
                  <div className="text-sm font-medium text-ink">{d.title}</div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-faint">
                    <span>{d.amountMinor != null ? money(d.amountMinor, d.currency ?? "Kč") : "—"}</span>
                    <span>{d.probability}%</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="px-2 py-4 text-center text-xs text-faint/60">prázdné</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
