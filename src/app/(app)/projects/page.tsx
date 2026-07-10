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

export default function ProjectsPage() {
  const { data, isLoading, error } = trpc.projects.list.useQuery(undefined);
  const [creating, setCreating] = useState(false);
  if (error) return <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Vyhrané dealy zakládají projekty samy — tady přidáš retainer nebo ad-hoc zakázku ručně.</p>
        <button className={btnPrimary} onClick={() => setCreating(true)}>+ Nový projekt</button>
      </div>
      {creating && <NewProjectModal onClose={() => setCreating(false)} />}
      {data.items.length === 0 ? <Empty doodle="/doodles/rocket.png">Zatím žádné projekty</Empty> : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((p) => {
        const st = STATUS[p.status];
        return (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="cursor-pointer transition-colors hover:border-accent/40">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{p.name}</span>
                {st && <Badge tone={st.tone}>{st.label}</Badge>}
              </div>
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
