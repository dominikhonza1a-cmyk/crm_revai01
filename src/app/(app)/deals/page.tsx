"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Loading, Empty, Modal, btnPrimary, btnGhost, fieldInput, fieldLabel } from "@/ui/components/ui";
import { KanbanBoard, type KanbanStage } from "@/ui/components/kanban";
import { Select } from "@/ui/components/select";
import { EditDealModal } from "@/ui/components/edit-modals";

const LOST_REASONS = [
  { value: "price", label: "Cena" },
  { value: "timing", label: "Načasování" },
  { value: "competitor", label: "Konkurence" },
  { value: "no_response", label: "Bez odpovědi" },
  { value: "other", label: "Jiný důvod" },
] as const;

/** Obchod — kanban pipeline s drag & drop. Drop na Vyhráno → potvrzení + automatika Won→projekt. */
export default function DealsPage() {
  const utils = trpc.useUtils();
  const stages = trpc.deals.stages.useQuery();
  const deals = trpc.deals.list.useQuery(undefined);

  const [pending, setPending] = useState<null | { dealId: string; dealTitle: string; stage: KanbanStage }>(null);
  const [lostReason, setLostReason] = useState<(typeof LOST_REASONS)[number]["value"]>("price");
  const [lostNote, setLostNote] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [editDealId, setEditDealId] = useState<string | null>(null);

  const move = trpc.deals.moveStage.useMutation({
    onSuccess: async (_res, vars) => {
      await Promise.all([
        utils.deals.list.invalidate(),
        utils.projects.list.invalidate(),
        utils.reporting.dashboard.invalidate(),
      ]);
      const st = stages.data?.find((s) => s.id === vars.toStageId);
      if (st?.kind === "won") setBanner("won");
      if (st?.kind === "lost") setBanner("lost");
      setPending(null);
    },
  });

  function onMove(dealId: string, stage: KanbanStage) {
    setBanner(null);
    const dealTitle = deals.data?.items.find((d) => d.id === dealId)?.title ?? "";
    if (stage.kind === "open") {
      move.mutate({ dealId, toStageId: stage.id });
    } else {
      setLostReason("price");
      setLostNote("");
      setPending({ dealId, dealTitle, stage });
    }
  }

  if (stages.error || deals.error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {(stages.error ?? deals.error)?.message}</div>;
  if (stages.isLoading || deals.isLoading || !stages.data || !deals.data) return <Loading />;

  return (
    <div className="space-y-4">
      {banner === "won" && (
        <div className="flex items-center justify-between rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent">
          <span>Deal vyhrán — projekt vznikl v draftu ze šablony.</span>
          <Link href="/projects" className="font-semibold hover:underline">Otevřít Projekty →</Link>
        </div>
      )}
      {banner === "lost" && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">Deal označen jako prohraný.</div>
      )}
      {move.error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">Přesun se nepovedl: {move.error.message}</div>
      )}

      {deals.data.items.length === 0
        ? <Empty>Zatím žádné dealy. Přidej první přes „+ Nový".</Empty>
        : <KanbanBoard stages={stages.data} deals={deals.data.items} onMove={onMove} onCardClick={setEditDealId} busy={move.isPending} />}

      {/* Editace dealu (klik na kartu) */}
      {editDealId && <EditDealModal dealId={editDealId} onClose={() => setEditDealId(null)} />}

      {/* Potvrzení výhry */}
      {pending && pending.stage.kind === "won" && (
        <Modal title="Označit jako vyhraný?" onClose={() => setPending(null)}>
          <img src="/doodles/trophy.png" alt="" width={100} height={100} className="mx-auto mb-2" />
          <p className="text-sm text-muted">
            Deal <span className="font-medium text-ink">„{pending.dealTitle}"</span> se přesune do <span className="text-accent">Vyhráno</span> a
            automaticky vznikne <span className="font-medium text-ink">projekt v draftu</span> ze šablony (fáze + úkoly).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setPending(null)}>Zrušit</button>
            <button className={btnPrimary} disabled={move.isPending}
              onClick={() => move.mutate({ dealId: pending.dealId, toStageId: pending.stage.id })}>
              {move.isPending ? "Ukládám…" : "🏆 Vyhráno — vytvořit projekt"}
            </button>
          </div>
        </Modal>
      )}

      {/* Prohra — povinný důvod */}
      {pending && pending.stage.kind === "lost" && (
        <Modal title="Označit jako prohraný" onClose={() => setPending(null)}>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            move.mutate({ dealId: pending.dealId, toStageId: pending.stage.id, lostReason, lostNote: lostNote || undefined });
          }}>
            <p className="text-sm text-muted">Deal <span className="font-medium text-ink">„{pending.dealTitle}"</span> — vyber důvod prohry:</p>
            <div>
              <label className={fieldLabel}>Důvod *</label>
              <Select value={lostReason} onChange={(v) => setLostReason(v as typeof lostReason)}
                options={LOST_REASONS.map((r) => ({ value: r.value, label: r.label }))} />
            </div>
            <div>
              <label className={fieldLabel}>Poznámka</label>
              <textarea className={`${fieldInput} min-h-20 resize-y`} value={lostNote} onChange={(e) => setLostNote(e.target.value)} placeholder="Volitelné detaily…" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setPending(null)}>Zrušit</button>
              <button type="submit" className="rounded-xl bg-red-400/90 px-4 py-2.5 text-sm font-semibold text-[#1a0b0b] transition-all hover:brightness-110 disabled:opacity-60" disabled={move.isPending}>
                {move.isPending ? "Ukládám…" : "Označit jako prohraný"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
