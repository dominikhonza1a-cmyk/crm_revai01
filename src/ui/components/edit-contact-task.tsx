"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";
import { Select } from "./select";

/** Editace kontaktu (jméno, e-mail, telefon, pozice) + smazání. */
export function EditContactModal({ contact, onClose }: {
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; jobTitle: string | null };
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [firstName, setFirstName] = useState(contact.firstName);
  const [lastName, setLastName] = useState(contact.lastName);
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [jobTitle, setJobTitle] = useState(contact.jobTitle ?? "");

  const refresh = () => utils.contacts.list.invalidate();
  const update = trpc.contacts.update.useMutation({ onSuccess: async () => { await refresh(); onClose(); } });
  const remove = trpc.contacts.remove.useMutation({ onSuccess: async () => { await refresh(); onClose(); } });

  return (
    <Modal title="Upravit kontakt" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          id: contact.id, firstName, lastName,
          email: email.trim() || undefined, phone: phone.trim() || undefined, jobTitle: jobTitle.trim() || undefined,
        });
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={fieldLabel}>Jméno *</label><input className={fieldInput} value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus /></div>
          <div><label className={fieldLabel}>Příjmení *</label><input className={fieldInput} value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          <div><label className={fieldLabel}>E-mail</label><input className={fieldInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className={fieldLabel}>Telefon</label><input className={fieldInput} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={fieldLabel}>Pozice</label><input className={fieldInput} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="jednatel, marketing…" /></div>
        </div>
        {(update.error || remove.error) && <p className="text-sm text-red-300">{formatError((update.error ?? remove.error)?.message)}</p>}
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-red-300 hover:underline" disabled={remove.isPending}
            onClick={() => { if (confirm(`Smazat kontakt ${contact.firstName} ${contact.lastName}?`)) remove.mutate({ id: contact.id }); }}>
            Smazat kontakt
          </button>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
            <button type="submit" className={btnPrimary} disabled={update.isPending}>{update.isPending ? "Ukládám…" : "Uložit"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

const PRIORITY = [["p1", "P1 — kritická"], ["p2", "P2 — vysoká"], ["p3", "P3 — běžná"], ["p4", "P4 — nízká"]] as const;

/** Editace úkolu (název, priorita, termín, řešitel, popis) + smazání. */
export function EditTaskModal({ task, onClose }: {
  task: { id: string; title: string; priority: string; dueAt: Date | string | null; assigneeId: string | null; description?: string | null };
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const users = trpc.security.listUsersBasic.useQuery();
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [dueAt, setDueAt] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [description, setDescription] = useState(task.description ?? "");

  const refresh = () => Promise.all([utils.tasks.list.invalidate(), utils.reporting.todayTasks.invalidate()]);
  const update = trpc.tasks.update.useMutation({ onSuccess: async () => { await refresh(); onClose(); } });
  const remove = trpc.tasks.remove.useMutation({ onSuccess: async () => { await refresh(); onClose(); } });

  return (
    <Modal title="Upravit úkol" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          id: task.id, title, priority: priority as never,
          dueAt: dueAt ? new Date(`${dueAt}T17:00:00`).toISOString() : null,
          assigneeId: assigneeId || null,
          description: description.trim() || null,
        });
      }}>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={fieldLabel}>Priorita</label>
            <Select value={priority} onChange={setPriority} options={PRIORITY.map(([v, l]) => ({ value: v, label: l }))} /></div>
          <div><label className={fieldLabel}>Termín</label><input className={fieldInput} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
          <div><label className={fieldLabel}>Řešitel</label>
            <Select value={assigneeId} onChange={setAssigneeId} placeholder="— nikdo —"
              options={[{ value: "", label: "— nikdo —" }, ...(users.data ?? []).map((u) => ({ value: u.id, label: u.fullName }))]} /></div>
        </div>
        <div><label className={fieldLabel}>Popis</label>
          <textarea className={fieldInput + " min-h-20 resize-y"} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        {(update.error || remove.error) && <p className="text-sm text-red-300">{formatError((update.error ?? remove.error)?.message)}</p>}
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-red-300 hover:underline" disabled={remove.isPending}
            onClick={() => { if (confirm("Smazat tento úkol?")) remove.mutate({ id: task.id }); }}>
            Smazat úkol
          </button>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
            <button type="submit" className={btnPrimary} disabled={update.isPending}>{update.isPending ? "Ukládám…" : "Uložit"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
