"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "./ui";
import { NewDocumentModal, NewNoteModal } from "./entity-forms";

type Host = "organization" | "contact" | "deal" | "project" | "task" | "idea";

const addBtn = "rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent";
const DOC_CAT_LABEL: Record<string, string> = { contract: "Smlouva", proposal: "Nabídka", questionnaire: "Dotazník", spec: "Specifikace", deliverable: "Výstup", credentials_ref: "Přístupy", other: "Jiné" };

/** Odkaz ke stažení nahraného souboru — vyžádá si podepsanou URL a otevře ji. */
function DownloadLink({ id, title }: { id: string; title: string }) {
  const dl = trpc.documents.downloadUrl.useMutation({ onSuccess: (r) => window.open(r.url, "_blank", "noopener") });
  return (
    <button className="text-ink hover:text-accent hover:underline disabled:opacity-60" disabled={dl.isPending}
      onClick={() => dl.mutate({ id })}>{title} {dl.isPending ? "…" : "↓"}</button>
  );
}

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
                <span className="min-w-0">
                  {d.kind === "external_ref" && d.externalUrl
                    ? <a href={d.externalUrl} target="_blank" rel="noreferrer" className="text-ink hover:text-accent hover:underline">{d.title} ↗</a>
                    : d.kind === "native_file"
                      ? <DownloadLink id={d.id} title={d.title} />
                      : <span className="text-ink">{d.title}</span>}
                  {(d.categoryLabel || d.docCategory) && <span className="ml-2 text-xs text-faint">{d.categoryLabel ?? DOC_CAT_LABEL[d.docCategory] ?? d.docCategory}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone={d.kind === "secret_ref" ? "red" : d.kind === "native_file" ? "blue" : "slate"}>
                    {d.kind === "external_ref" ? "odkaz" : d.kind === "secret_ref" ? "přístupy" : "soubor"}
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
