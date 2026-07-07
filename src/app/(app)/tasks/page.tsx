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
      <div className="inline-flex rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${view === t.key ? "bg-accent-strong text-[#08110c]" : "text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>
        : isLoading || !data ? <Loading />
        : data.items.length === 0 ? <Empty>Žádné úkoly v tomto pohledu 🎉</Empty>
        : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line">
              {data.items.map((t) => {
                const st = STATUS[t.status];
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">{t.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
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
