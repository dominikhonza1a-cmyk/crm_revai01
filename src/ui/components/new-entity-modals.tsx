"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";

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
          <select className={fieldInput} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required>
            <option value="">— vyber klienta —</option>
            {(orgs.data?.items ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></div>
        <div><label className={fieldLabel}>Název projektu *</label>
          <input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Hlasový asistent" required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={fieldLabel}>Typ</label>
            <select className={fieldInput} value={projectType} onChange={(e) => setProjectType(e.target.value as never)}>
              <option value="chatbot_voicebot">Chatbot / Voicebot</option>
              <option value="process_automation">Automatizace</option>
              <option value="custom_ai">Custom AI</option>
            </select></div>
          <div><label className={fieldLabel}>Zakázka</label>
            <select className={fieldInput} value={engagementType} onChange={(e) => setEngagementType(e.target.value as never)}>
              <option value="one_off">Jednorázová</option>
              <option value="retainer">Retainer</option>
            </select></div>
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
            <select className={fieldInput} value={type} onChange={(e) => setType(e.target.value as never)}>
              <option value="internal">Interní úkol</option>
              <option value="delivery">Dodávka (projekt)</option>
              <option value="support">Ticket podpory (SLA)</option>
              <option value="sales_followup">Obchodní follow-up</option>
            </select></div>
          <div><label className={fieldLabel}>Priorita</label>
            <select className={fieldInput} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="p1">P1 — kritická</option><option value="p2">P2 — vysoká</option>
              <option value="p3">P3 — běžná</option><option value="p4">P4 — nízká</option>
            </select></div>
          <div><label className={fieldLabel}>Klient</label>
            <select className={fieldInput} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
              <option value="">—</option>
              {(orgs.data?.items ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select></div>
          <div><label className={fieldLabel}>Termín</label>
            <input className={fieldInput} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
          <div><label className={fieldLabel}>Řešitel</label>
            <select className={fieldInput} value={effectiveAssignee} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">— nikdo —</option>
              {(users.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select></div>
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
