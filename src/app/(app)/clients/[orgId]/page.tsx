"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Tabs, Loading, Empty, money } from "@/ui/components/ui";
import { TimelineTab, DocumentsTab } from "@/ui/components/entity-tabs";
import { NewContactModal } from "@/ui/components/entity-forms";
import { TagPicker } from "@/ui/components/tag-picker";
import { CustomFieldsCard } from "@/ui/components/custom-fields-card";
import { EditClientModal } from "@/ui/components/edit-modals";
import { EditContactModal } from "@/ui/components/edit-contact-task";
import { NewProjectModal } from "@/ui/components/new-entity-modals";

const LIFECYCLE: Record<string, { label: string; tone: "slate" | "green" | "amber" | "blue" }> = {
  prospect: { label: "Prospekt", tone: "blue" }, active_client: { label: "Klient", tone: "green" },
  past_client: { label: "Bývalý", tone: "slate" }, partner: { label: "Partner", tone: "amber" },
};
const TABS = [
  { key: "overview", label: "Přehled" }, { key: "projects", label: "Projekty" }, { key: "contacts", label: "Kontakty" },
  { key: "timeline", label: "Timeline" }, { key: "documents", label: "Dokumenty" }, { key: "deals", label: "Dealy" },
];

export default function ClientDetailPage() {
  const orgId = useParams().orgId as string;
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const org = trpc.organizations.get.useQuery({ id: orgId });

  if (org.isLoading) return <Loading />;
  if (!org.data) return <Empty>Klient nenalezen</Empty>;
  const o = org.data;
  const lc = LIFECYCLE[o.lifecycleStage];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-ink">←</Link>
        <h1 className="text-2xl font-semibold text-ink">{o.name}</h1>
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
        </div>
      )}
      {tab === "projects" && <ProjectsTab orgId={orgId} />}
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
  if (q.isLoading || !q.data) return <Loading />;
  if (!q.data.items.length) return <Empty>Žádné dealy</Empty>;
  return <Card className="p-0 overflow-hidden"><ul className="divide-y divide-line">{q.data.items.map((d) => (
    <li key={d.id} className="flex items-center justify-between px-4 py-3"><span className="text-ink">{d.title}</span><span className="text-sm text-muted">{d.amountMinor != null ? money(d.amountMinor, d.currency ?? "Kč") : "—"}</span></li>
  ))}</ul></Card>;
}
