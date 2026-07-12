"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";

type Host = "organization" | "contact" | "deal" | "project" | "task" | "idea";

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
        {create.error && <p className="text-sm text-red-300">{formatError(create.error.message)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Ukládám…" : "Vytvořit"}</button>
        </div>
      </form>
    </Modal>
  );
}

const DOC_CATEGORIES = [
  ["contract", "Smlouva"], ["proposal", "Nabídka"], ["questionnaire", "Dotazník"],
  ["spec", "Specifikace"], ["deliverable", "Výstup"], ["other", "Jiné"],
] as const;

/** Nový dokument — nahraný soubor, odkaz na externí úložiště, nebo secret reference (bez obsahu). */
export function NewDocumentModal({ entityType, entityId, onClose }: { entityType: Host; entityId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<"native_file" | "external_ref" | "secret_ref">("native_file");
  const [title, setTitle] = useState("");
  const [externalUrl, setUrl] = useState("");
  const [secretLocation, setSecretLoc] = useState("");
  const [docCategory, setCategory] = useState("questionnaire");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const uploadUrl = trpc.documents.uploadUrl.useMutation();
  const link = trpc.documents.link.useMutation();
  const finish = async () => { await utils.documents.list.invalidate(); onClose(); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      let storageKey: string | undefined;
      if (kind === "native_file") {
        if (!file) { setErr("Vyber soubor."); return; }
        const up = await uploadUrl.mutateAsync({ filename: file.name });
        // upload přímo do Supabase Storage přes podepsanou URL
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
        const { error } = await sb.storage.from(up.bucket).uploadToSignedUrl(up.path, up.token, file);
        if (error) throw new Error(`Nahrání selhalo: ${error.message}`);
        storageKey = up.path;
      }
      await link.mutateAsync({
        kind, title: title || file?.name || "Dokument", entityType, entityId,
        docCategory: (kind === "secret_ref" ? "credentials_ref" : docCategory) as never,
        categoryLabel: docCategory === "other" ? (categoryLabel.trim() || undefined) : undefined,
        externalUrl: kind === "external_ref" ? externalUrl : undefined,
        storageProvider: kind === "native_file" ? "supabase" : kind === "external_ref" ? (/drive\.google|docs\.google/.test(externalUrl) ? "gdrive" : "url") : undefined,
        storageKey, mimeType: file?.type || undefined,
        secretLocation: kind === "secret_ref" ? secretLocation : undefined,
        containsPii: false,
      });
      await finish();
    } catch (e) {
      setErr(formatError((e as Error).message));
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Nový dokument" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className={fieldLabel}>Typ</label>
          <select className={fieldInput} value={kind} onChange={(e) => setKind(e.target.value as never)}>
            <option value="native_file">Nahrát soubor (smlouva, dotazník…)</option>
            <option value="external_ref">Odkaz (Drive / web)</option>
            <option value="secret_ref">Přístupy — jen odkaz, bez obsahu</option>
          </select>
        </div>

        {kind === "native_file" && (
          <div>
            <label className={fieldLabel}>Soubor *</label>
            <input className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent hover:file:brightness-110"
              type="file" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !title) setTitle(f.name); }} required />
            <p className="mt-1.5 text-xs text-faint">Uloží se šifrovaně v našem úložišti (max 25 MB). PDF, obrázky, dokumenty…</p>
          </div>
        )}

        <div><label className={fieldLabel}>Název {kind === "native_file" ? "" : "*"}</label><input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} required={kind !== "native_file"} placeholder={file?.name} /></div>

        {kind === "external_ref" && (
          <div><label className={fieldLabel}>URL *</label><input className={fieldInput} type="text" value={externalUrl} onChange={(e) => setUrl(e.target.value)} placeholder="drive.google.com/… (https:// doplníme)" required /></div>
        )}

        {kind !== "secret_ref" ? (
          <>
            <div><label className={fieldLabel}>Kategorie</label>
              <select className={fieldInput} value={docCategory} onChange={(e) => setCategory(e.target.value)}>
                {DOC_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {docCategory === "other" && (
              <div><label className={fieldLabel}>Upřesni kategorii</label><input className={fieldInput} value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} placeholder="např. předávací protokol" /></div>
            )}
          </>
        ) : (
          <div>
            <label className={fieldLabel}>Kde přístupy leží *</label>
            <input className={fieldInput} value={secretLocation} onChange={(e) => setSecretLoc(e.target.value)} placeholder="1Password / vault ACME / n8n-prod" required />
            <p className="mt-1.5 text-xs text-faint">Hodnota přístupů se do CRM nikdy neukládá — jen odkaz, kde je najdeš.</p>
          </div>
        )}

        {err && <p className="text-sm text-red-300">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Ukládám…" : "Přidat"}</button>
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
        {create.error && <p className="text-sm text-red-300">{formatError(create.error.message)}</p>}
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
        {log.error && <p className="text-sm text-red-300">{formatError(log.error.message)}</p>}
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
