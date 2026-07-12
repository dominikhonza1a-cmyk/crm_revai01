"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";
import { Select } from "./select";

/** Ruční založení projektu (Won → projekt zůstává automatika; tohle je pro retainery/ad-hoc). */
export function NewProjectModal({ onClose, defaultOrgId }: { onClose: () => void; defaultOrgId?: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const orgs = trpc.organizations.list.useQuery({});
  const [organizationId, setOrganizationId] = useState(defaultOrgId ?? "");
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<"chatbot_voicebot" | "process_automation" | "custom_ai">("chatbot_voicebot");
  const [engagementType, setEngagementType] = useState<"one_off" | "retainer">("one_off");

  const create = trpc.projects.create.useMutation({
    onSuccess: async (res) => { await Promise.all([utils.projects.list.invalidate(), utils.reporting.dashboard.invalidate()]); onClose(); router.push(`/projects/${res.id}`); },
  });

  return (
    <Modal title="Nový projekt" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ organizationId, name, projectType, engagementType }); }}>
        <div><label className={fieldLabel}>Klient *</label>
          <Select value={organizationId} onChange={setOrganizationId} placeholder="— vyber klienta —"
            options={(orgs.data?.items ?? []).map((o) => ({ value: o.id, label: o.name }))} /></div>
        <div><label className={fieldLabel}>Název projektu *</label>
          <input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Hlasový asistent" required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={fieldLabel}>Typ</label>
            <Select value={projectType} onChange={(v) => setProjectType(v as never)}
              options={[{ value: "chatbot_voicebot", label: "Chatbot / Voicebot" }, { value: "process_automation", label: "Automatizace" }, { value: "custom_ai", label: "Custom AI" }]} /></div>
          <div><label className={fieldLabel}>Zakázka</label>
            <Select value={engagementType} onChange={(v) => setEngagementType(v as never)}
              options={[{ value: "one_off", label: "Jednorázová" }, { value: "retainer", label: "Retainer" }]} /></div>
        </div>
        <p className="text-xs text-faint">Cena, platby a retainer se vyplňují na kartě projektu (sekce Finance).</p>
        {create.error && <p className="text-sm text-red-300">{formatError(create.error.message)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Zakládám…" : "Založit projekt"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Nový úkol / ticket odkudkoli — s výběrem klienta a projektu. */
export function NewStandaloneTaskModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const orgs = trpc.organizations.list.useQuery({});
  const users = trpc.security.listUsersBasic.useQuery();
  const me = trpc.me.useQuery();
  const [type, setType] = useState<"internal" | "delivery" | "support" | "sales_followup">("internal");
  const [title, setTitle] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  const [priority, setPriority] = useState("p3");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const effectiveAssignee = assigneeId ?? me.data?.userId ?? "";

  const create = trpc.tasks.create.useMutation({
    onSuccess: async () => { await Promise.all([utils.tasks.list.invalidate(), utils.reporting.todayTasks.invalidate(), utils.reporting.dashboard.invalidate()]); onClose(); },
  });

  return (
    <Modal title="Nový úkol" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        create.mutate({
          type, title, priority: priority as never,
          organizationId: organizationId || undefined,
          assigneeId: effectiveAssignee || undefined,
          dueAt: dueAt ? new Date(`${dueAt}T17:00:00`).toISOString() : undefined,
          channel: type === "support" ? "portal" : undefined,
        });
      }}>
        <div><label className={fieldLabel}>Název *</label>
          <input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={fieldLabel}>Typ</label>
            <Select value={type} onChange={(v) => setType(v as never)}
              options={[{ value: "internal", label: "Interní úkol" }, { value: "delivery", label: "Dodávka (projekt)" }, { value: "support", label: "Ticket podpory (SLA)" }, { value: "sales_followup", label: "Obchodní follow-up" }]} /></div>
          <div><label className={fieldLabel}>Priorita</label>
            <Select value={priority} onChange={setPriority}
              options={[{ value: "p1", label: "P1 — kritická" }, { value: "p2", label: "P2 — vysoká" }, { value: "p3", label: "P3 — běžná" }, { value: "p4", label: "P4 — nízká" }]} /></div>
          <div><label className={fieldLabel}>Klient</label>
            <Select value={organizationId} onChange={setOrganizationId} placeholder="—"
              options={[{ value: "", label: "—" }, ...(orgs.data?.items ?? []).map((o) => ({ value: o.id, label: o.name }))]} /></div>
          <div><label className={fieldLabel}>Termín</label>
            <input className={fieldInput} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
          <div><label className={fieldLabel}>Řešitel</label>
            <Select value={effectiveAssignee} onChange={setAssigneeId} placeholder="— nikdo —"
              options={[{ value: "", label: "— nikdo —" }, ...(users.data ?? []).map((u) => ({ value: u.id, label: u.fullName }))]} /></div>
        </div>
        {type === "support" && <p className="text-xs text-faint">Ticket automaticky spustí SLA měřidla dle tieru klienta.</p>}
        {create.error && <p className="text-sm text-red-300">{formatError(create.error.message)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Vytvářím…" : "Vytvořit"}</button>
        </div>
      </form>
    </Modal>
  );
}
