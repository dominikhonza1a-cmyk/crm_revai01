"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";

const TABS = [
  { key: "my_work", label: "Moje práce" },
  { key: "ticket_queue", label: "Tickety" },
  { key: "all", label: "Vše" },
] as const;
type View = (typeof TABS)[number]["key"];

const STATUS: Record<string, { label: string; tone: "slate" | "green" | "amber" | "blue" | "red" }> = {
  todo: { label: "K řešení", tone: "slate" },
  in_progress: { label: "Probíhá", tone: "blue" },
  waiting_on_client: { label: "Čeká na klienta", tone: "amber" },
  blocked: { label: "Blokováno", tone: "red" },
  done: { label: "Hotovo", tone: "green" },
  canceled: { label: "Zrušeno", tone: "slate" },
};

export default function TasksPage() {
  const [view, setView] = useState<View>("my_work");
  const { data, isLoading, error } = trpc.tasks.list.useQuery({ view });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === t.key ? "bg-accent-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Chyba: {error.message}</div>
        : isLoading || !data ? <Loading />
        : data.items.length === 0 ? <Empty>Žádné úkoly v tomto pohledu 🎉</Empty>
        : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-slate-100">
              {data.items.map((t) => {
                const st = STATUS[t.status];
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{t.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                        {t.type === "support" && <Badge tone="blue">ticket</Badge>}
                        <span className="uppercase">{t.priority}</span>
                        {t.dueAt && <span>· do {new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
                      </div>
                    </div>
                    {st && <Badge tone={st.tone}>{st.label}</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
    </div>
  );
}
