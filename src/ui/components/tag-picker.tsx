"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";

type EntityType = "organization" | "contact" | "deal" | "project" | "task" | "document" | "idea";

/** Štítky entity: barevné chipy + přiřazení existujícího / vytvoření nového tagu. */
export function TagPicker({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const utils = trpc.useUtils();
  const assigned = trpc.tags.forEntity.useQuery({ entityType, entityId });
  const all = trpc.tags.list.useQuery();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const refresh = () => Promise.all([utils.tags.forEntity.invalidate({ entityType, entityId }), utils.tags.list.invalidate()]);
  const assign = trpc.tags.assign.useMutation({ onSuccess: refresh });
  const unassign = trpc.tags.unassign.useMutation({ onSuccess: refresh });
  const create = trpc.tags.create.useMutation({
    onSuccess: async (res) => { setDraft(""); await assign.mutateAsync({ tagId: res.id, entityType, entityId }); },
  });

  const assignedIds = new Set((assigned.data ?? []).map((t) => t.id));
  const available = (all.data ?? []).filter((t) => !assignedIds.has(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(assigned.data ?? []).map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${t.color ?? "#5b6670"}22`, color: t.color ?? "#9aa4b2" }}>
          {t.name}
          <button className="opacity-60 hover:opacity-100" title="Odebrat štítek"
            onClick={() => unassign.mutate({ tagId: t.id, entityType, entityId })}>×</button>
        </span>
      ))}

      <div className="relative">
        <button className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-faint transition-colors hover:border-accent/50 hover:text-accent"
          onClick={() => setOpen((o) => !o)}>+ štítek</button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-xl shadow-black/30">
              {available.length > 0 && (
                <div className="mb-2 flex max-h-36 flex-wrap gap-1.5 overflow-auto">
                  {available.map((t) => (
                    <button key={t.id} className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-transform hover:scale-105"
                      style={{ backgroundColor: `${t.color ?? "#5b6670"}22`, color: t.color ?? "#9aa4b2" }}
                      onClick={async () => { await assign.mutateAsync({ tagId: t.id, entityType, entityId }); }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) create.mutate({ name: draft.trim() }); }}>
                <input className="w-full rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink placeholder:text-faint outline-none focus:border-accent"
                  placeholder="Nový štítek…" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                <button type="submit" className="rounded-lg bg-accent-strong px-2 py-1 text-xs font-semibold text-[#08110c] disabled:opacity-50" disabled={create.isPending || !draft.trim()}>+</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
