"use client";

import { useState, type DragEvent } from "react";
import { money } from "./ui";

/** Prezentační kanban pipeline — nativní HTML5 drag & drop, žádná závislost navíc. */
export interface KanbanStage { id: string; name: string; kind: string; position: number }
export interface KanbanDeal {
  id: string;
  title: string;
  pipelineStageId: string;
  amountMinor: bigint | null;
  currency: string | null;
  probability: number;
}

export function KanbanBoard({ stages, deals, onMove, busy }: {
  stages: KanbanStage[];
  deals: KanbanDeal[];
  /** Volá se při přetažení karty do JINÉ fáze (vč. won/lost zón). */
  onMove: (dealId: string, toStage: KanbanStage) => void;
  busy?: boolean;
}) {
  const [overStage, setOverStage] = useState<string | null>(null);
  const open = [...stages].filter((s) => s.kind === "open").sort((a, b) => a.position - b.position);
  const terminal = [...stages].filter((s) => s.kind !== "open").sort((a, b) => a.position - b.position);
  const byStage = (id: string) => deals.filter((d) => d.pipelineStageId === id);

  function handleDrop(e: DragEvent, stage: KanbanStage) {
    e.preventDefault();
    setOverStage(null);
    const dealId = e.dataTransfer.getData("text/deal-id");
    if (!dealId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.pipelineStageId === stage.id) return;
    onMove(dealId, stage);
  }

  const dropProps = (stage: KanbanStage) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); setOverStage(stage.id); },
    onDragLeave: () => setOverStage((s) => (s === stage.id ? null : s)),
    onDrop: (e: DragEvent) => handleDrop(e, stage),
  });

  return (
    <div className={`space-y-4 ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {/* Otevřené fáze */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {open.map((s) => {
          const items = byStage(s.id);
          const sum = items.reduce((a, d) => a + Number(d.amountMinor ?? 0), 0);
          return (
            <div key={s.id} {...dropProps(s)}
              className={`flex w-72 shrink-0 flex-col rounded-2xl border p-2.5 transition-colors ${overStage === s.id ? "border-accent bg-accent-soft" : "border-line bg-surface/50"}`}>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-semibold text-ink">{s.name}</span>
                <span className="text-xs text-faint">{items.length} · {money(sum)}</span>
              </div>
              <div className="min-h-16 space-y-2">
                {items.map((d) => (
                  <div key={d.id} draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/deal-id", d.id)}
                    className="cursor-grab rounded-xl border border-line bg-surface p-3 transition-colors hover:border-accent/40 active:cursor-grabbing">
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

      {/* Won / Lost drop zóny */}
      <div className="flex gap-4">
        {terminal.map((s) => (
          <div key={s.id} {...dropProps(s)}
            className={`flex-1 rounded-2xl border-2 border-dashed p-4 text-center text-sm font-medium transition-colors ${
              overStage === s.id
                ? s.kind === "won" ? "border-accent bg-accent-soft text-accent" : "border-red-400 bg-red-400/10 text-red-300"
                : "border-line text-faint"
            }`}>
            {s.kind === "won" ? "🏆 Přetáhni sem — Vyhráno (vznikne projekt)" : "✕ Přetáhni sem — Prohráno"}
          </div>
        ))}
      </div>
    </div>
  );
}
