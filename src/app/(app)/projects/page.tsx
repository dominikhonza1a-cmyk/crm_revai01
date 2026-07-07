"use client";

import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";

const STATUS: Record<string, { label: string; tone: "slate" | "green" | "amber" }> = {
  draft: { label: "Draft", tone: "slate" },
  active: { label: "Aktivní", tone: "green" },
  on_hold: { label: "Pozastavený", tone: "amber" },
  closed: { label: "Uzavřený", tone: "slate" },
};
const TYPE: Record<string, string> = { chatbot_voicebot: "Chatbot/Voicebot", process_automation: "Automatizace", custom_ai: "Custom AI" };

export default function ProjectsPage() {
  const { data, isLoading, error } = trpc.projects.list.useQuery(undefined);
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Chyba: {error.message}</div>;
  if (isLoading || !data) return <Loading />;
  if (data.items.length === 0) return <Empty>Zatím žádné projekty. Vznikají automaticky z vyhraných dealů.</Empty>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((p) => {
        const st = STATUS[p.status];
        return (
          <Card key={p.id} className="cursor-pointer transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-slate-800">{p.name}</span>
              {st && <Badge tone={st.tone}>{st.label}</Badge>}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span>{TYPE[p.projectType] ?? p.projectType}</span>
              <span>·</span>
              <span>{p.engagementType === "retainer" ? "Retainer" : "Jednorázový"}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
