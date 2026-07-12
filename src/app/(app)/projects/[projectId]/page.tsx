"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Tabs, Loading, Empty, btnPrimary, SectionTitle, money } from "@/ui/components/ui";
import { TimelineTab, DocumentsTab } from "@/ui/components/entity-tabs";
import { NewTaskModal, TaskStatusSelect } from "@/ui/components/entity-forms";
import { TagPicker } from "@/ui/components/tag-picker";
import { CustomFieldsCard } from "@/ui/components/custom-fields-card";
import { EditTaskModal } from "@/ui/components/edit-contact-task";
import { ConfirmDeleteModal } from "@/ui/components/confirm-delete";
import { useEffect, useRef } from "react";
import { MarkdownLite } from "@/ui/components/markdown-lite";

const STATUS: Record<string, { label: string; tone: "slate" | "green" | "amber" }> = {
  draft: { label: "Draft", tone: "slate" }, active: { label: "Aktivní", tone: "green" },
  on_hold: { label: "Pozastavený", tone: "amber" }, closed: { label: "Uzavřený", tone: "slate" },
};
const TYPE: Record<string, string> = { chatbot_voicebot: "Chatbot/Voicebot", process_automation: "Automatizace", custom_ai: "Custom AI" };
const TABS = [{ key: "overview", label: "Přehled" }, { key: "tasks", label: "Úkoly" }, { key: "timeline", label: "Timeline" }, { key: "documents", label: "Dokumenty" }];

export default function ProjectDetailPage() {
  const projectId = useParams().projectId as string;
  const [tab, setTab] = useState("overview");
  const router = useRouter();
  const utils = trpc.useUtils();
  const [confirmDelProject, setConfirmDelProject] = useState(false);
  const project = trpc.projects.get.useQuery({ id: projectId });
  const phases = trpc.projects.phases.useQuery({ id: projectId });

  const invalidate = async () => Promise.all([utils.projects.get.invalidate({ id: projectId }), utils.projects.phases.invalidate({ id: projectId }), utils.projects.list.invalidate(), utils.activities.timeline.invalidate()]);
  const changeStatus = trpc.projects.changeStatus.useMutation({ onSuccess: invalidate });
  const rename = trpc.projects.update.useMutation({ onSuccess: invalidate });
  const removeProject = trpc.projects.remove.useMutation({
    onSuccess: async () => { await utils.projects.list.invalidate(); router.push("/projects"); },
  });
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
        <h1 className="font-display text-3xl tracking-wide text-ink">{p.name}</h1>
        <button className="text-xs text-faint hover:text-accent" title="Přejmenovat projekt"
          onClick={() => { const n = prompt("Nový název projektu:", p.name); if (n?.trim() && n !== p.name) rename.mutate({ projectId, name: n.trim() }); }}>✎</button>
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
        <button className="text-xs text-red-300 hover:underline" disabled={removeProject.isPending}
          onClick={() => setConfirmDelProject(true)}>Smazat</button>
        {confirmDelProject && <ConfirmDeleteModal name={`projekt „${p.name}"`} detail="Smažou se i jeho úkoly."
          busy={removeProject.isPending} onClose={() => setConfirmDelProject(false)} onConfirm={() => removeProject.mutate({ projectId })} />}
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
            <div className="flex justify-between"><span className="text-muted">Poslední změna</span><span className="text-ink">{new Date(p.updatedAt).toLocaleString("cs-CZ")}</span></div>
            <GitRepoRow projectId={projectId} current={(p.customFields as Record<string, unknown>)?.git_repo as string | undefined} />
          </div></Card>
          <FinanceCard projectId={projectId} isRetainer={p.engagementType === "retainer"}
            priceMinor={p.priceMinor} monthlyMinor={p.monthlyAmountMinor} retainerActive={p.retainerActive}
            payments={(p.payments ?? []) as { amountMinor: number; date: string; note?: string }[]} />
          <CustomFieldsCard entityType="project" entityId={projectId} values={(p.customFields ?? {}) as Record<string, unknown>} />
          <div className="sm:col-span-2">
            <DescriptionCard projectId={projectId} initial={p.description ?? ""} />
          </div>
        </div>
      )}
      {tab === "tasks" && <ProjectTasks projectId={projectId} />}
      {tab === "timeline" && <TimelineTab entityType="project" entityId={projectId} />}
      {tab === "documents" && <DocumentsTab entityType="project" entityId={projectId} />}
    </div>
  );
}

/** Popis projektu — volné psaní s autosave (jako Nápady), čtení s markdown formátováním. */
function DescriptionCard({ projectId, initial }: { projectId: string; initial: string }) {
  const utils = trpc.useUtils();
  const [text, setText] = useState<string | null>(null);
  const [editing, setEditing] = useState(!initial.trim());
  const [saved, setSaved] = useState<"saved" | "saving" | "dirty">("saved");
  // po uložení zapíšeme hodnotu do cache projects.get — jinak by se po přepnutí tabu
  // karta odmountovala a znovu naseedovala starou hodnotou (text by „zmizel")
  const update = trpc.projects.update.useMutation({
    onSuccess: (_d, vars) => {
      setSaved("saved");
      utils.projects.get.setData({ id: projectId }, (old) => old ? { ...old, description: vars.description ?? null } : old);
    },
  });
  const updateRef = useRef(update.mutate);
  updateRef.current = update.mutate;
  const value = text ?? initial;

  useEffect(() => {
    if (text === null) return;
    setSaved("dirty");
    const t = setTimeout(() => { setSaved("saving"); updateRef.current({ projectId, description: text || null }); }, 800);
    return () => clearTimeout(t);
  }, [text, projectId]);

  return (
    <Card>
      <SectionTitle right={
        <span className="flex items-center gap-3">
          <span className={`text-xs ${saved === "saved" ? "text-accent" : "text-faint"}`}>{saved === "saved" ? "Uloženo ✓" : saved === "saving" ? "Ukládám…" : "Píšeš…"}</span>
          <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
            onClick={() => setEditing((e) => !e)}>{editing ? "✓ Hotovo" : "✎ Upravit"}</button>
        </span>
      }>Popis a poznámky</SectionTitle>
      {editing ? (
        <textarea
          className="min-h-40 w-full resize-y rounded-2xl border border-line bg-surface-2 p-4 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent/40"
          placeholder="Cokoli k projektu — zadání, dohody, stav… Ukládá se samo. Umí **tučně**, # nadpisy, - odrážky, odkazy."
          value={value} onChange={(e) => setText(e.target.value)} />
      ) : (
        <div className="cursor-text" onDoubleClick={() => setEditing(true)} title="Dvojklik = upravit">
          {value.trim() ? <MarkdownLite text={value} /> : <p className="text-sm text-faint">Zatím bez popisu.</p>}
        </div>
      )}
    </Card>
  );
}

/** Finance projektu: sjednaná cena, evidence plateb (zálohy/doplatky), stav retaineru. */
function FinanceCard({ projectId, isRetainer, priceMinor, monthlyMinor, retainerActive, payments }: {
  projectId: string; isRetainer: boolean; priceMinor: bigint | null; monthlyMinor: bigint | null;
  retainerActive: boolean; payments: { amountMinor: number; date: string; note?: string }[];
}) {
  const utils = trpc.useUtils();
  const refresh = () => Promise.all([utils.projects.get.invalidate({ id: projectId }), utils.reporting.dashboard.invalidate()]);
  const [price, setPrice] = useState(priceMinor != null ? String(Number(priceMinor) / 100) : "");
  const [monthly, setMonthly] = useState(monthlyMinor != null ? String(Number(monthlyMinor) / 100) : "");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");

  const setFinance = trpc.projects.setFinance.useMutation({ onSuccess: refresh });
  const setMonthlyM = trpc.projects.setMonthlyAmount.useMutation({ onSuccess: refresh });
  const addPayment = trpc.projects.addPayment.useMutation({ onSuccess: async () => { setPayAmount(""); setPayNote(""); await refresh(); } });
  const removePayment = trpc.projects.removePayment.useMutation({ onSuccess: refresh });

  const paid = payments.reduce((a, x) => a + x.amountMinor, 0);
  const priceNum = priceMinor != null ? Number(priceMinor) : null;
  const state = priceNum == null || priceNum === 0 ? null : paid >= priceNum ? "paid" : paid > 0 ? "partial" : "unpaid";
  const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return Number.isNaN(n) ? null : Math.round(n * 100); };
  const inp = "w-32 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-accent";

  return (
    <Card>
      <SectionTitle right={
        state === "paid" ? <Badge tone="green">Zaplaceno ✓</Badge>
        : state === "partial" ? <Badge tone="amber">Záloha {money(paid)} z {money(priceNum!)}</Badge>
        : state === "unpaid" ? <Badge tone="red">Nezaplaceno</Badge> : undefined
      }>Finance</SectionTitle>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Sjednaná cena (Kč)</span>
          <span className="flex items-center gap-2">
            <input className={inp} inputMode="decimal" placeholder="např. 29900" value={price} onChange={(e) => setPrice(e.target.value)}
              onBlur={() => setFinance.mutate({ projectId, priceMinor: price.trim() && num(price) != null ? BigInt(num(price)!) : null })} />
          </span>
        </div>

        {isRetainer && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Měsíční retainer (Kč)</span>
              <input className={inp} inputMode="decimal" placeholder="např. 7490" value={monthly} onChange={(e) => setMonthly(e.target.value)}
                onBlur={() => setMonthlyM.mutate({ projectId, amountMinor: monthly.trim() && num(monthly) != null ? BigInt(num(monthly)!) : null })} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Retainer běží <span className="text-faint">(počítá se na dashboard)</span></span>
              <button
                className={`h-6 w-11 rounded-full p-0.5 transition-colors ${retainerActive ? "bg-accent-strong" : "bg-white/10"}`}
                disabled={setFinance.isPending}
                onClick={() => setFinance.mutate({ projectId, retainerActive: !retainerActive })}>
                <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${retainerActive ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </>
        )}

        <div className="border-t border-line pt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted">Jednorázové platby (zálohy, doplatky)</span>
            <span className="font-medium text-ink">{money(paid)} přijato</span>
          </div>
          <p className="mb-2 text-xs text-faint">Retainer se účtuje sám 1. den měsíce (přepínač výše). Sem přidávej jen jednorázové platby — v měsíci dle data se propíšou do cashflow.</p>
          {payments.map((pay, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5">
              <span className="text-faint">{pay.date}</span>
              <span className="flex-1 truncate text-muted">{pay.note ?? ""}</span>
              <span className="font-medium text-ink">{money(pay.amountMinor)}</span>
              <button className="rounded px-1.5 text-red-300 hover:bg-red-400/10 hover:underline" disabled={removePayment.isPending}
                onClick={() => { if (confirm(`Smazat platbu ${money(pay.amountMinor)}${pay.note ? ` (${pay.note})` : ""}?`)) removePayment.mutate({ projectId, index: i }); }}>Smazat</button>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-1.5">
            <input className={inp + " w-24"} inputMode="decimal" placeholder="Kč" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <input className={inp + " w-32"} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            <input className={inp + " flex-1"} placeholder="poznámka (záloha…)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            <button className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:border-accent/40 hover:text-accent disabled:opacity-60"
              disabled={addPayment.isPending || !num(payAmount)}
              onClick={() => addPayment.mutate({ projectId, amountMinor: num(payAmount)!, date: payDate, note: payNote.trim() || undefined })}>
              {addPayment.isPending ? "…" : "+ Platba"}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Mapování GitHub repa na projekt (git → timeline). Formát owner/repo; prázdné = odpojit. */
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
  const [editing, setEditing] = useState<null | { id: string; title: string; priority: string; dueAt: Date | string | null; assigneeId: string | null }>(null);
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
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                <div className="min-w-0 flex-1 cursor-pointer" title="Klik = upravit úkol"
                  onClick={() => setEditing({ id: t.id, title: t.title, priority: t.priority, dueAt: t.dueAt, assigneeId: t.assigneeId ?? null })}>
                  <div className="truncate text-sm text-ink">{t.title} <span className="text-xs text-faint">✎</span></div>
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
      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
