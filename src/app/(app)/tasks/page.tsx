"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";
import { TaskStatusSelect } from "@/ui/components/entity-forms";
import { NewStandaloneTaskModal } from "@/ui/components/new-entity-modals";
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
  const { data, isLoading, error } = trpc.tasks.list.useQuery({ view });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {creating && <NewStandaloneTaskModal onClose={() => setCreating(false)} />}
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
        : data.items.length === 0 ? <Empty>Žádné úkoly v tomto pohledu 🎉</Empty>
        : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line">
              {data.items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{t.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                      {t.type === "support" && <Badge tone="blue">ticket</Badge>}
                      <span className="uppercase">{t.priority}</span>
                      {t.dueAt && <span>· do {new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
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
