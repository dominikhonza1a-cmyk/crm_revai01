"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty, btnPrimary } from "@/ui/components/ui";
import { NewProjectModal } from "@/ui/components/new-entity-modals";

const STATUS: Record<string, { label: string; tone: "slate" | "green" | "amber" }> = {
  draft: { label: "Draft", tone: "slate" },
  active: { label: "Aktivní", tone: "green" },
  on_hold: { label: "Pozastavený", tone: "amber" },
  closed: { label: "Uzavřený", tone: "slate" },
};
const TYPE: Record<string, string> = { chatbot_voicebot: "Chatbot/Voicebot", process_automation: "Automatizace", custom_ai: "Custom AI" };
const FILTERS = [
  { key: "all", label: "Vše" }, { key: "active", label: "Aktivní" }, { key: "draft", label: "Rozpracované" },
  { key: "on_hold", label: "Pozastavené" }, { key: "closed", label: "Uzavřené" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export default function ProjectsPage() {
  const { data, isLoading, error } = trpc.projects.list.useQuery(undefined);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  if (error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;

  const counts = data.items.reduce((m, p) => { m[p.status] = (m[p.status] ?? 0) + 1; return m; }, {} as Record<string, number>);
  const shown = filter === "all" ? data.items : data.items.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.key ? "bg-accent-strong text-[#08110c]" : "text-muted hover:text-ink"}`}>
              {f.label}{f.key !== "all" && counts[f.key] ? <span className="ml-1 text-xs opacity-70">{counts[f.key]}</span> : ""}
            </button>
          ))}
        </div>
        <button className={btnPrimary} onClick={() => setCreating(true)}>+ Nový projekt</button>
      </div>
      {creating && <NewProjectModal onClose={() => setCreating(false)} />}

      {shown.length === 0 ? <Empty doodle="/doodles/rocket.png">Žádné projekty v tomto filtru</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const st = STATUS[p.status];
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="block h-full">
                <Card className="h-full cursor-pointer transition-colors hover:border-accent/40">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-ink">{p.name}</span>
                    {st && <Badge tone={st.tone}>{st.label}</Badge>}
                  </div>
                  {p.organizationName && <div className="mt-1 truncate text-sm text-accent/80">{p.organizationName}</div>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-faint">
                    <span>{TYPE[p.projectType] ?? p.projectType}</span>
                    <span>·</span>
                    <span>{p.engagementType === "retainer" ? "Retainer" : "Jednorázový"}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
