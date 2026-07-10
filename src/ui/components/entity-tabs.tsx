"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "./ui";
import { NewDocumentModal, NewNoteModal } from "./entity-forms";

type Host = "organization" | "contact" | "deal" | "project" | "task" | "idea";

const addBtn = "rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent";

/** Agregovaná timeline entity (read-only feed) + přidání poznámky. */
export function TimelineTab({ entityType, entityId }: { entityType: Host; entityId: string }) {
  const q = trpc.activities.timeline.useQuery({ entityType, entityId });
  const [open, setOpen] = useState(false);
  if (q.isLoading || !q.data) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={addBtn} onClick={() => setOpen(true)}>+ Poznámka</button></div>
      {q.data.items.length === 0 ? <Empty>Žádné události</Empty> : (
        <Card>
          <ol className="space-y-4">
            {q.data.items.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div><div className="text-sm text-ink">{e.title}</div><div className="text-xs text-faint">{new Date(e.occurredAt).toLocaleString("cs-CZ")}</div></div>
              </li>
            ))}
          </ol>
        </Card>
      )}
      {open && <NewNoteModal entityType={entityType} entityId={entityId} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Dokumenty entity (reference/nativní/secret) + přidání. */
export function DocumentsTab({ entityType, entityId }: { entityType: Host; entityId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.documents.list.useQuery({ entityType, entityId });
  const removeDoc = trpc.documents.remove.useMutation({ onSuccess: () => utils.documents.list.invalidate({ entityType, entityId }) });
  const [open, setOpen] = useState(false);
  if (q.isLoading || !q.data) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={addBtn} onClick={() => setOpen(true)}>+ Dokument</button></div>
      {q.data.length === 0 ? <Empty>Žádné dokumenty</Empty> : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line">
            {q.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3">
                {d.kind === "external_ref" && d.externalUrl
                  ? <a href={d.externalUrl} target="_blank" rel="noreferrer" className="text-ink hover:text-accent hover:underline">{d.title} ↗</a>
                  : <span className="text-ink">{d.title}</span>}
                <span className="flex items-center gap-2">
                  <Badge tone={d.kind === "secret_ref" ? "red" : d.kind === "native_file" ? "blue" : "slate"}>
                    {d.kind === "external_ref" ? "odkaz" : d.kind === "secret_ref" ? "secret" : "soubor"}
                  </Badge>
                  <button className="text-xs text-red-300 hover:underline" title="Smazat dokument" disabled={removeDoc.isPending}
                    onClick={() => { if (confirm(`Smazat dokument „${d.title}"?`)) removeDoc.mutate({ id: d.id }); }}>×</button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {open && <NewDocumentModal entityType={entityType} entityId={entityId} onClose={() => setOpen(false)} />}
    </div>
  );
}
