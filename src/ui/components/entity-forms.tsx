"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost } from "./ui";

type Host = "organization" | "contact" | "deal" | "project" | "task";

/** Nový kontakt (u klienta). */
export function NewContactModal({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJob] = useState("");
  const create = trpc.contacts.create.useMutation({
    onSuccess: async () => { await utils.contacts.list.invalidate(); onClose(); },
  });

  return (
    <Modal title="Nový kontakt" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ organizationId, firstName, lastName, email: email || undefined, phone: phone || undefined, jobTitle: jobTitle || undefined });
      }}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fieldLabel}>Jméno *</label><input className={fieldInput} value={firstName} onChange={(e) => setFirst(e.target.value)} required autoFocus /></div>
          <div><label className={fieldLabel}>Příjmení *</label><input className={fieldInput} value={lastName} onChange={(e) => setLast(e.target.value)} required /></div>
        </div>
        <div><label className={fieldLabel}>E-mail</label><input className={fieldInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fieldLabel}>Telefon</label><input className={fieldInput} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><label className={fieldLabel}>Pozice</label><input className={fieldInput} value={jobTitle} onChange={(e) => setJob(e.target.value)} /></div>
        </div>
        {create.error && <p className="text-sm text-red-300">{create.error.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Ukládám…" : "Vytvořit"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Nový dokument — odkaz na externí úložiště, nebo secret reference (bez URL!). */
export function NewDocumentModal({ entityType, entityId, onClose }: { entityType: Host; entityId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<"external_ref" | "secret_ref">("external_ref");
  const [title, setTitle] = useState("");
  const [externalUrl, setUrl] = useState("");
  const [secretLocation, setSecretLoc] = useState("");
  const [docCategory, setCategory] = useState("other");
  const link = trpc.documents.link.useMutation({
    onSuccess: async () => { await utils.documents.list.invalidate(); onClose(); },
  });

  return (
    <Modal title="Nový dokument" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        const isDrive = /drive\.google|docs\.google/.test(externalUrl);
        link.mutate({
          kind, title, entityType, entityId,
          docCategory: (kind === "secret_ref" ? "credentials_ref" : docCategory) as never,
          externalUrl: kind === "external_ref" ? externalUrl : undefined,
          storageProvider: kind === "external_ref" ? (isDrive ? "gdrive" : "url") : undefined,
          secretLocation: kind === "secret_ref" ? secretLocation : undefined,
          containsPii: false,
        });
      }}>
        <div>
          <label className={fieldLabel}>Typ</label>
          <select className={fieldInput} value={kind} onChange={(e) => setKind(e.target.value as never)}>
            <option value="external_ref">Odkaz (Drive / web)</option>
            <option value="secret_ref">Secret reference (přístupy — bez obsahu)</option>
          </select>
        </div>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
        {kind === "external_ref" ? (
          <>
            <div><label className={fieldLabel}>URL *</label><input className={fieldInput} type="url" value={externalUrl} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" required /></div>
            <div><label className={fieldLabel}>Kategorie</label>
              <select className={fieldInput} value={docCategory} onChange={(e) => setCategory(e.target.value)}>
                <option value="contract">Smlouva</option><option value="proposal">Nabídka</option><option value="spec">Specifikace</option><option value="deliverable">Výstup</option><option value="other">Ostatní</option>
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className={fieldLabel}>Kde secret leží *</label>
            <input className={fieldInput} value={secretLocation} onChange={(e) => setSecretLoc(e.target.value)} placeholder="1Password / vault ACME / n8n-prod" required />
            <p className="mt-1.5 text-xs text-faint">Hodnota přístupů se do CRM nikdy neukládá — jen odkaz, kde je najdeš.</p>
          </div>
        )}
        {link.error && <p className="text-sm text-red-300">{link.error.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={link.isPending}>{link.isPending ? "Ukládám…" : "Přidat"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Nový úkol (na projektu). */
export function NewTaskModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("p3");
  const [dueAt, setDueAt] = useState("");
  const create = trpc.tasks.create.useMutation({
    onSuccess: async () => { await utils.tasks.list.invalidate(); onClose(); },
  });

  return (
    <Modal title="Nový úkol" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        create.mutate({
          type: "delivery", title, projectId,
          priority: priority as never,
          dueAt: dueAt ? new Date(`${dueAt}T17:00:00`).toISOString() : undefined,
        });
      }}>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fieldLabel}>Priorita</label>
            <select className={fieldInput} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="p1">P1 — kritická</option><option value="p2">P2 — vysoká</option><option value="p3">P3 — běžná</option><option value="p4">P4 — nízká</option>
            </select>
          </div>
          <div><label className={fieldLabel}>Termín</label><input className={fieldInput} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
        </div>
        {create.error && <p className="text-sm text-red-300">{create.error.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Ukládám…" : "Vytvořit"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Poznámka do timeline (Activity type=note → timeline event). */
export function NewNoteModal({ entityType, entityId, onClose }: { entityType: Host; entityId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const log = trpc.activities.log.useMutation({
    onSuccess: async () => { await utils.activities.timeline.invalidate(); onClose(); },
  });

  return (
    <Modal title="Nová poznámka" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        log.mutate({ type: "note", subject, body: body || undefined, entityType, entityId });
      }}>
        <div><label className={fieldLabel}>Titulek *</label><input className={fieldInput} value={subject} onChange={(e) => setSubject(e.target.value)} required autoFocus /></div>
        <div><label className={fieldLabel}>Text</label><textarea className={`${fieldInput} min-h-24 resize-y`} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        {log.error && <p className="text-sm text-red-300">{log.error.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={log.isPending}>{log.isPending ? "Ukládám…" : "Uložit"}</button>
        </div>
      </form>
    </Modal>
  );
}

const TASK_STATUSES = [
  { value: "todo", label: "K řešení" },
  { value: "in_progress", label: "Probíhá" },
  { value: "waiting_on_client", label: "Čeká na klienta" },
  { value: "blocked", label: "Blokováno" },
  { value: "done", label: "Hotovo" },
  { value: "canceled", label: "Zrušeno" },
] as const;

/** Inline změna stavu úkolu (volá tasks.changeStatus — u ticketů řídí i SLA pauzy/vyřešení). */
export function TaskStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const utils = trpc.useUtils();
  const change = trpc.tasks.changeStatus.useMutation({
    onSuccess: async () => { await Promise.all([utils.tasks.list.invalidate(), utils.reporting.dashboard.invalidate()]); },
  });
  return (
    <select
      className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-accent"
      value={status}
      disabled={change.isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => change.mutate({ taskId, toStatus: e.target.value as never })}
    >
      {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}
