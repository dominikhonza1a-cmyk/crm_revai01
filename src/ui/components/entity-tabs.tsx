"use client";

import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "./ui";

type Host = "organization" | "contact" | "deal" | "project" | "task";

/** Agregovaná timeline entity (read-only feed). */
export function TimelineTab({ entityType, entityId }: { entityType: Host; entityId: string }) {
  const q = trpc.activities.timeline.useQuery({ entityType, entityId });
  if (q.isLoading || !q.data) return <Loading />;
  if (!q.data.items.length) return <Empty>Žádné události</Empty>;
  return (
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
  );
}

/** Dokumenty entity (reference/nativní/secret). */
export function DocumentsTab({ entityType, entityId }: { entityType: Host; entityId: string }) {
  const q = trpc.documents.list.useQuery({ entityType, entityId });
  if (q.isLoading || !q.data) return <Loading />;
  if (!q.data.length) return <Empty>Žádné dokumenty</Empty>;
  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {q.data.map((d) => (
          <li key={d.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-ink">{d.title}</span>
            <Badge tone={d.kind === "secret_ref" ? "red" : d.kind === "native_file" ? "blue" : "slate"}>
              {d.kind === "external_ref" ? "odkaz" : d.kind === "secret_ref" ? "secret" : "soubor"}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
