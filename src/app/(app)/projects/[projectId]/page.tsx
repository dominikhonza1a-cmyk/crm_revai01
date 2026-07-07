"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Tabs, Loading, Empty } from "@/ui/components/ui";
import { TimelineTab, DocumentsTab } from "@/ui/components/entity-tabs";

const STATUS: Record<string, { label: string; tone: "slate" | "green" | "amber" }> = {
  draft: { label: "Draft", tone: "slate" }, active: { label: "Aktivní", tone: "green" },
  on_hold: { label: "Pozastavený", tone: "amber" }, closed: { label: "Uzavřený", tone: "slate" },
};
const TYPE: Record<string, string> = { chatbot_voicebot: "Chatbot/Voicebot", process_automation: "Automatizace", custom_ai: "Custom AI" };
const TABS = [{ key: "overview", label: "Přehled" }, { key: "tasks", label: "Úkoly" }, { key: "timeline", label: "Timeline" }, { key: "documents", label: "Dokumenty" }];

export default function ProjectDetailPage() {
  const projectId = useParams().projectId as string;
  const [tab, setTab] = useState("overview");
  const project = trpc.projects.get.useQuery({ id: projectId });
  const phases = trpc.projects.phases.useQuery({ id: projectId });

  if (project.isLoading) return <Loading />;
  if (!project.data) return <Empty>Projekt nenalezen</Empty>;
  const p = project.data;
  const st = STATUS[p.status];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-ink">←</Link>
        <h1 className="text-2xl font-semibold text-ink">{p.name}</h1>
        {st && <Badge tone={st.tone}>{st.label}</Badge>}
        <span className="text-sm text-faint">{TYPE[p.projectType] ?? p.projectType} · {p.engagementType === "retainer" ? "Retainer" : "Jednorázový"}</span>
      </div>

      {/* Fáze-stepper */}
      {phases.data && phases.data.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-1.5">
            {phases.data.map((ph, i) => {
              const current = ph.id === p.currentPhaseId;
              const done = ph.status === "done";
              return (
                <div key={ph.id} className="flex items-center gap-1.5">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${current ? "bg-accent-strong text-[#08110c]" : done ? "bg-accent-soft text-accent" : "bg-white/5 text-muted"}`}>{ph.name}</span>
                  {i < phases.data!.length - 1 && <span className="text-faint">›</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "overview" && (
        <Card><div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Kód</span><span className="text-ink">{p.code ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted">Start</span><span className="text-ink">{p.startDate ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted">Typ zakázky</span><span className="text-ink">{p.engagementType === "retainer" ? "Retainer" : "Jednorázový"}</span></div>
        </div></Card>
      )}
      {tab === "tasks" && <ProjectTasks projectId={projectId} />}
      {tab === "timeline" && <TimelineTab entityType="project" entityId={projectId} />}
      {tab === "documents" && <DocumentsTab entityType="project" entityId={projectId} />}
    </div>
  );
}

function ProjectTasks({ projectId }: { projectId: string }) {
  const q = trpc.tasks.list.useQuery({ projectId, view: "all" });
  if (q.isLoading || !q.data) return <Loading />;
  if (!q.data.items.length) return <Empty>Žádné úkoly</Empty>;
  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {q.data.items.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-ink">{t.title}</span>
            <Badge tone={t.status === "done" ? "green" : t.status === "in_progress" ? "blue" : "slate"}>{t.status}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
