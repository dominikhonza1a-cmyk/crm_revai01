"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";
import { TaskStatusSelect } from "@/ui/components/entity-forms";
import { NewStandaloneTaskModal } from "@/ui/components/new-entity-modals";
import { EditTaskModal } from "@/ui/components/edit-contact-task";
import { btnPrimary } from "@/ui/components/ui";

const TABS = [
  { key: "my_work", label: "Moje práce" },
  { key: "ticket_queue", label: "Tickety" },
  { key: "all", label: "Vše" },
] as const;
type View = (typeof TABS)[number]["key"];

export default function TasksPage() {
  const [view, setView] = useState<View>("my_work");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<null | { id: string; title: string; priority: string; dueAt: Date | string | null; assigneeId: string | null; description?: string | null }>(null);
  const { data, isLoading, error } = trpc.tasks.list.useQuery({ view });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {creating && <NewStandaloneTaskModal onClose={() => setCreating(false)} />}
      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} />}
      <div className="flex items-center justify-between">
      <div className="inline-flex rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${view === t.key ? "bg-accent-strong text-[#08110c]" : "text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <button className={btnPrimary} onClick={() => setCreating(true)}>+ Nový úkol</button>
      </div>

      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>
        : isLoading || !data ? <Loading />
        : data.items.length === 0 ? <Empty>Doposud nepřiřazen žádný úkol</Empty>
        : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line">
              {data.items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                  <div className="min-w-0 flex-1 cursor-pointer" title="Klik = upravit úkol"
                    onClick={() => setEditing({ id: t.id, title: t.title, priority: t.priority, dueAt: t.dueAt, assigneeId: t.assigneeId ?? null, description: (t as { description?: string | null }).description })}>
                    <div className="truncate text-sm font-medium text-ink">{t.title} <span className="text-xs text-faint">✎</span></div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                      {t.type === "support" && <Badge tone="blue">ticket</Badge>}
                      {t.clientName && (
                        <Link href={`/clients/${t.clientId}`} onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent transition hover:brightness-110">
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {t.clientName}
                        </Link>
                      )}
                      {t.projectName && <span className="text-faint">· {t.projectName}</span>}
                      <span className="uppercase">{t.priority}</span>
                      {t.dueAt && <span>· do {new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
                      {t.tags.map((tag, ti) => (
                        <span key={ti} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ backgroundColor: `${tag.color ?? "#5b6670"}22`, color: tag.color ?? "#9aa4b2" }}>{tag.name}</span>
                      ))}
                    </div>
                  </div>
                  <TaskStatusSelect taskId={t.id} status={t.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}
    </div>
  );
}
