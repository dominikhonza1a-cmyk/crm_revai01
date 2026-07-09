"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Tabs, Loading, Empty, btnPrimary } from "@/ui/components/ui";
import { TimelineTab, DocumentsTab } from "@/ui/components/entity-tabs";
import { NewTaskModal, TaskStatusSelect } from "@/ui/components/entity-forms";
import { TagPicker } from "@/ui/components/tag-picker";
import { CustomFieldsCard } from "@/ui/components/custom-fields-card";

const STATUS: Record<string, { label: string; tone: "slate" | "green" | "amber" }> = {
  draft: { label: "Draft", tone: "slate" }, active: { label: "Aktivní", tone: "green" },
  on_hold: { label: "Pozastavený", tone: "amber" }, closed: { label: "Uzavřený", tone: "slate" },
};
const TYPE: Record<string, string> = { chatbot_voicebot: "Chatbot/Voicebot", process_automation: "Automatizace", custom_ai: "Custom AI" };
const TABS = [{ key: "overview", label: "Přehled" }, { key: "tasks", label: "Úkoly" }, { key: "timeline", label: "Timeline" }, { key: "documents", label: "Dokumenty" }];

export default function ProjectDetailPage() {
  const projectId = useParams().projectId as string;
  const [tab, setTab] = useState("overview");
  const utils = trpc.useUtils();
  const project = trpc.projects.get.useQuery({ id: projectId });
  const phases = trpc.projects.phases.useQuery({ id: projectId });

  const invalidate = async () => Promise.all([utils.projects.get.invalidate({ id: projectId }), utils.projects.phases.invalidate({ id: projectId }), utils.projects.list.invalidate(), utils.activities.timeline.invalidate()]);
  const changeStatus = trpc.projects.changeStatus.useMutation({ onSuccess: invalidate });
  const advancePhase = trpc.projects.advancePhase.useMutation({ onSuccess: invalidate });

  if (project.isLoading) return <Loading />;
  if (!project.data) return <Empty>Projekt nenalezen</Empty>;
  const p = project.data;
  const st = STATUS[p.status];
  const actionError = changeStatus.error ?? advancePhase.error;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/projects" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-ink">←</Link>
        <h1 className="text-2xl font-semibold text-ink">{p.name}</h1>
        {st && <Badge tone={st.tone}>{st.label}</Badge>}
        <span className="text-sm text-faint">{TYPE[p.projectType] ?? p.projectType} · {p.engagementType === "retainer" ? "Retainer" : "Jednorázový"}</span>
        <TagPicker entityType="project" entityId={projectId} />
        <span className="flex-1" />
        {p.status === "draft" && (
          <button className={btnPrimary} disabled={changeStatus.isPending}
            onClick={() => changeStatus.mutate({ projectId, toStatus: "active" })}>
            {changeStatus.isPending ? "Aktivuji…" : "✓ Potvrdit a aktivovat"}
          </button>
        )}
        {p.status === "on_hold" && (
          <button className={btnPrimary} disabled={changeStatus.isPending}
            onClick={() => changeStatus.mutate({ projectId, toStatus: "active" })}>Obnovit</button>
        )}
      </div>

      {actionError && <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{actionError.message}</div>}

      {/* Fáze-stepper — klik na budoucí fázi ji aktivuje */}
      {phases.data && phases.data.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-1.5">
            {phases.data.map((ph, i) => {
              const current = ph.id === p.currentPhaseId;
              const done = ph.status === "done";
              return (
                <div key={ph.id} className="flex items-center gap-1.5">
                  <button
                    disabled={current || advancePhase.isPending}
                    onClick={() => advancePhase.mutate({ projectId, toPhase: ph.key as never })}
                    title={current ? "Aktuální fáze" : `Posunout do fáze ${ph.name}`}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      current ? "bg-accent-strong text-[#08110c]"
                      : done ? "bg-accent-soft text-accent"
                      : "bg-white/5 text-muted hover:bg-white/10 hover:text-ink"}`}>
                    {ph.name}
                  </button>
                  {i < phases.data!.length - 1 && <span className="text-faint">›</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-faint">Klikem na fázi projekt posuneš (zpět jen se souhlasem admina).</p>
        </Card>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Kód</span><span className="text-ink">{p.code ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Start</span><span className="text-ink">{p.startDate ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Typ zakázky</span><span className="text-ink">{p.engagementType === "retainer" ? "Retainer" : "Jednorázový"}</span></div>
            <GitRepoRow projectId={projectId} current={(p.customFields as Record<string, unknown>)?.git_repo as string | undefined} />
            {p.engagementType === "retainer" && <RetainerRow projectId={projectId} current={p.monthlyAmountMinor} />}
          </div></Card>
          <CustomFieldsCard entityType="project" entityId={projectId} values={(p.customFields ?? {}) as Record<string, unknown>} />
        </div>
      )}
      {tab === "tasks" && <ProjectTasks projectId={projectId} />}
      {tab === "timeline" && <TimelineTab entityType="project" entityId={projectId} />}
      {tab === "documents" && <DocumentsTab entityType="project" entityId={projectId} />}
    </div>
  );
}

/** Mapování GitHub repa na projekt (git → timeline). Formát owner/repo; prázdné = odpojit. */
/** Měsíční fakturace retaineru (CZK) — sčítá se na dashboardu do „Měsíční retainery". */
function RetainerRow({ projectId, current }: { projectId: string; current: bigint | null }) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState(current != null ? String(Number(current) / 100) : "");
  const [saved, setSaved] = useState(false);
  const set = trpc.projects.setMonthlyAmount.useMutation({
    onSuccess: async () => { setSaved(true); setTimeout(() => setSaved(false), 2000); await Promise.all([utils.projects.get.invalidate({ id: projectId }), utils.reporting.dashboard.invalidate()]); },
  });
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted">Měsíční retainer (Kč)</span>
      <div className="flex items-center gap-2">
        <input
          className="w-56 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-accent"
          inputMode="decimal" placeholder="např. 15000" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:border-accent/40 hover:text-accent disabled:opacity-60"
          disabled={set.isPending}
          onClick={() => {
            const n = parseFloat(value.replace(",", "."));
            set.mutate({ projectId, amountMinor: value.trim() && !Number.isNaN(n) ? BigInt(Math.round(n * 100)) : null });
          }}>
          {set.isPending ? "…" : saved ? "✓" : "Uložit"}
        </button>
      </div>
    </div>
  );
}

function GitRepoRow({ projectId, current }: { projectId: string; current?: string }) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState(current ?? "");
  const [saved, setSaved] = useState(false);
  const set = trpc.projects.setGitRepo.useMutation({
    onSuccess: async () => { setSaved(true); setTimeout(() => setSaved(false), 2000); await utils.projects.get.invalidate({ id: projectId }); },
  });
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted">Git repo</span>
      <div className="flex items-center gap-2">
        <input
          className="w-56 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-accent"
          placeholder="owner/repo" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:border-accent/40 hover:text-accent disabled:opacity-60"
          disabled={set.isPending}
          onClick={() => set.mutate({ projectId, repo: value.trim() || null })}>
          {set.isPending ? "…" : saved ? "✓" : "Uložit"}
        </button>
      </div>
      {set.error && <span className="text-xs text-red-300">{set.error.message.includes("owner/repo") ? "Formát: owner/repo" : "Chyba"}</span>}
    </div>
  );
}

function ProjectTasks({ projectId }: { projectId: string }) {
  const q = trpc.tasks.list.useQuery({ projectId, view: "all" });
  const [open, setOpen] = useState(false);
  if (q.isLoading || !q.data) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent" onClick={() => setOpen(true)}>+ Úkol</button>
      </div>
      {q.data.items.length === 0 ? <Empty>Žádné úkoly</Empty> : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line">
            {q.data.items.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{t.title}</div>
                  <div className="mt-0.5 text-xs text-faint">
                    <span className="uppercase">{t.priority}</span>
                    {t.dueAt && <span> · do {new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
                  </div>
                </div>
                <TaskStatusSelect taskId={t.id} status={t.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {open && <NewTaskModal projectId={projectId} onClose={() => setOpen(false)} />}
    </div>
  );
}
