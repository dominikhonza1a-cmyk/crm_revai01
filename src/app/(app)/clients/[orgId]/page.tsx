"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Tabs, Loading, Empty, money, SectionTitle } from "@/ui/components/ui";
import { MarkdownLite } from "@/ui/components/markdown-lite";
import { TimelineTab, DocumentsTab } from "@/ui/components/entity-tabs";
import { NewContactModal } from "@/ui/components/entity-forms";
import { TagPicker } from "@/ui/components/tag-picker";
import { CustomFieldsCard } from "@/ui/components/custom-fields-card";
import { EditClientModal, EditDealModal } from "@/ui/components/edit-modals";
import { EditContactModal, EditTaskModal } from "@/ui/components/edit-contact-task";
import { NewProjectModal, NewStandaloneTaskModal } from "@/ui/components/new-entity-modals";
import { TaskStatusSelect } from "@/ui/components/entity-forms";

import { LIFECYCLE_META } from "@/domain/enums";
const TABS = [
  { key: "overview", label: "Přehled" }, { key: "projects", label: "Projekty" }, { key: "tasks", label: "Úkoly" },
  { key: "contacts", label: "Kontakty" }, { key: "timeline", label: "Timeline" }, { key: "documents", label: "Dokumenty" }, { key: "deals", label: "Dealy" },
];


export default function ClientDetailPage() {
  const orgId = useParams().orgId as string;
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const org = trpc.organizations.get.useQuery({ id: orgId });

  if (org.isLoading) return <Loading />;
  if (!org.data) return <Empty>Klient nenalezen</Empty>;
  const o = org.data;
  const lc = LIFECYCLE_META[o.lifecycleStage];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-ink">←</Link>
        <h1 className="font-display text-3xl tracking-wide text-ink">{o.name}</h1>
        {lc && <Badge tone={lc.tone}>{lc.label}</Badge>}
        <TagPicker entityType="organization" entityId={orgId} />
        <span className="flex-1" />
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
          onClick={() => setEditing(true)}>✎ Upravit</button>
      </div>
      {editing && <EditClientModal onClose={() => setEditing(false)}
        org={{ id: orgId, name: o.name, website: o.website, industry: o.industry, employeeBand: o.employeeBand, lifecycleStage: o.lifecycleStage, source: o.source }} />}
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><div className="space-y-2 text-sm">
            <Row label="Web" value={o.website ?? "—"} />
            <Row label="Odvětví" value={o.industry ?? "—"} />
            <Row label="Velikost" value={o.employeeBand ?? "—"} />
            <Row label="Zdroj" value={o.source ?? "—"} />
          </div></Card>
          <CustomFieldsCard entityType="organization" entityId={orgId} values={(o.customFields ?? {}) as Record<string, unknown>} />
          <div className="sm:col-span-2">
            <OrgNotesCard orgId={orgId} initial={(o as { notes?: string | null }).notes ?? ""} />
          </div>
        </div>
      )}
      {tab === "projects" && <ProjectsTab orgId={orgId} />}
      {tab === "tasks" && <TasksTab orgId={orgId} />}
      {tab === "contacts" && <ContactsTab orgId={orgId} />}
      {tab === "timeline" && <TimelineTab entityType="organization" entityId={orgId} />}
      {tab === "documents" && <DocumentsTab entityType="organization" entityId={orgId} />}
      {tab === "deals" && <DealsTab orgId={orgId} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted">{label}</span><span className="text-ink">{value}</span></div>;
}

/** Info / poznámky klienta — volné psaní s autosave (jako popis projektu), čtení s markdown. */
function OrgNotesCard({ orgId, initial }: { orgId: string; initial: string }) {
  const utils = trpc.useUtils();
  const [text, setText] = useState<string | null>(null);
  const [editing, setEditing] = useState(!initial.trim());
  const [saved, setSaved] = useState<"saved" | "saving" | "dirty">("saved");
  const update = trpc.organizations.update.useMutation({
    onSuccess: (_d, vars) => {
      setSaved("saved");
      utils.organizations.get.setData({ id: orgId }, (old) => old ? { ...old, notes: vars.notes ?? null } : old);
    },
  });
  const updateRef = useRef(update.mutate);
  updateRef.current = update.mutate;
  const value = text ?? initial;

  useEffect(() => {
    if (text === null) return;
    setSaved("dirty");
    const t = setTimeout(() => { setSaved("saving"); updateRef.current({ id: orgId, notes: text || null }); }, 800);
    return () => clearTimeout(t);
  }, [text, orgId]);

  return (
    <Card>
      <SectionTitle right={
        <span className="flex items-center gap-3">
          <span className={`text-xs ${saved === "saved" ? "text-accent" : "text-faint"}`}>{saved === "saved" ? "Uloženo ✓" : saved === "saving" ? "Ukládám…" : "Píšeš…"}</span>
          <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
            onClick={() => setEditing((e) => !e)}>{editing ? "✓ Hotovo" : "✎ Upravit"}</button>
        </span>
      }>Info a poznámky</SectionTitle>
      {editing ? (
        <textarea
          className="min-h-32 w-full resize-y rounded-2xl border border-line bg-surface-2 p-4 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent/40"
          placeholder="Cokoli ke klientovi — kontext, dohody, na co nezapomenout… Ukládá se samo. Umí **tučně**, # nadpisy, - odrážky, odkazy."
          value={value} onChange={(e) => setText(e.target.value)} />
      ) : (
        <div className="cursor-text" onDoubleClick={() => setEditing(true)} title="Dvojklik = upravit">
          {value.trim() ? <MarkdownLite text={value} /> : <p className="text-sm text-faint">Zatím bez poznámek.</p>}
        </div>
      )}
    </Card>
  );
}

function ProjectsTab({ orgId }: { orgId: string }) {
  const q = trpc.projects.list.useQuery({ organizationId: orgId });
  const [creating, setCreating] = useState(false);
  if (q.isLoading || !q.data) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent" onClick={() => setCreating(true)}>+ Nový projekt</button>
      </div>
      {!q.data.items.length ? <Empty doodle="/doodles/rocket.png">Žádné projekty</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2">{q.data.items.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block h-full"><Card className="h-full hover:border-accent/40"><div className="flex items-center justify-between"><span className="font-medium text-ink">{p.name}</span><Badge tone={p.status === "active" ? "green" : "slate"}>{p.status}</Badge></div></Card></Link>
        ))}</div>
      )}
      {creating && <NewProjectModal defaultOrgId={orgId} onClose={() => setCreating(false)} />}
    </div>
  );
}

function ContactsTab({ orgId }: { orgId: string }) {
  const q = trpc.contacts.list.useQuery({ organizationId: orgId });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; jobTitle: string | null }>(null);
  if (q.isLoading || !q.data) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent" onClick={() => setOpen(true)}>+ Kontakt</button>
      </div>
      {q.data.items.length === 0 ? <Empty>Žádné kontakty</Empty> : (
        <Card className="p-0 overflow-hidden"><ul className="divide-y divide-line">{q.data.items.map((c) => (
          <li key={c.id ?? c.email ?? Math.random()} className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
            title="Klik = upravit kontakt"
            onClick={() => setEditing({ id: c.id ?? "", firstName: c.firstName ?? "", lastName: c.lastName ?? "", email: c.email ?? null, phone: c.phone ?? null, jobTitle: c.jobTitle ?? null })}>
            <span className="text-ink">{`${c.firstName} ${c.lastName}`.trim()}</span>
            <span className="text-sm text-muted">{c.jobTitle ?? ""} {c.email ? `· ${c.email}` : ""} <span className="ml-1 text-xs text-faint">✎</span></span>
          </li>
        ))}</ul></Card>
      )}
      {open && <NewContactModal organizationId={orgId} onClose={() => setOpen(false)} />}
      {editing && <EditContactModal contact={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DealsTab({ orgId }: { orgId: string }) {
  const q = trpc.deals.list.useQuery({ organizationId: orgId });
  const [editId, setEditId] = useState<string | null>(null);
  if (q.isLoading || !q.data) return <Loading />;
  if (!q.data.items.length) return <Empty>Žádné dealy — vytvoř přes „+ Nový" nahoře, nebo v sekci Obchod.</Empty>;
  return (
    <>
      <Card className="p-0 overflow-hidden"><ul className="divide-y divide-line">{q.data.items.map((d) => (
        <li key={d.id} className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
          title="Klik = upravit deal" onClick={() => setEditId(d.id)}>
          <span className="text-ink">{d.title} <span className="text-xs text-faint">✎</span></span>
          <span className="text-sm text-muted">{d.amountMinor != null ? money(d.amountMinor, d.currency ?? "Kč") : "—"}</span>
        </li>
      ))}</ul></Card>
      {editId && <EditDealModal dealId={editId} onClose={() => setEditId(null)} />}
    </>
  );
}

/** Úkoly klienta — prolinkované (filtr organizationId), s tvorbou a editací. */
function TasksTab({ orgId }: { orgId: string }) {
  const q = trpc.tasks.list.useQuery({ organizationId: orgId, view: "all" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<null | { id: string; title: string; priority: string; dueAt: Date | string | null; assigneeId: string | null; description?: string | null }>(null);
  if (q.isLoading || !q.data) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent" onClick={() => setCreating(true)}>+ Nový úkol</button>
      </div>
      {!q.data.items.length ? <Empty doodle="/doodles/checklist.svg">Zatím žádné úkoly u tohoto klienta</Empty> : (
        <Card className="overflow-hidden p-0"><ul className="divide-y divide-line">{q.data.items.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1 cursor-pointer" title="Klik = upravit úkol"
              onClick={() => setEditing({ id: t.id, title: t.title, priority: t.priority, dueAt: t.dueAt, assigneeId: t.assigneeId ?? null, description: (t as { description?: string | null }).description })}>
              <div className="truncate text-sm text-ink">{t.title} <span className="text-xs text-faint">✎</span></div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                {t.type === "support" && <Badge tone="blue">ticket</Badge>}
                <span className="uppercase">{t.priority}</span>
                {t.dueAt && <span>· do {new Date(t.dueAt).toLocaleDateString("cs-CZ")}</span>}
              </div>
            </div>
            <TaskStatusSelect taskId={t.id} status={t.status} />
          </li>
        ))}</ul></Card>
      )}
      {creating && <NewStandaloneTaskModal defaultOrgId={orgId} onClose={() => setCreating(false)} />}
      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
