"use client";

import { trpc } from "@/ui/trpc";
import { Card, Badge, SectionTitle, Loading } from "@/ui/components/ui";

const MODULE_LABEL: Record<string, string> = {
  organizations: "Klienti", contacts: "Kontakty", deals: "Obchod", projects: "Projekty",
  tasks: "Úkoly", documents: "Dokumenty", reporting: "Reporting", settings: "Nastavení", audit: "Audit log",
};
const LEVEL_TONE: Record<string, "slate" | "green" | "amber" | "blue"> = { none: "slate", read: "blue", write: "amber", manage: "green" };

export default function SettingsPage() {
  const me = trpc.me.useQuery();
  if (me.isLoading || !me.data) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <SectionTitle>Můj účet</SectionTitle>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">E-mail</span><span className="font-medium text-slate-800">{me.data.email}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="font-medium text-slate-800">{me.data.roles.join(", ") || "—"}</span></div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Moje oprávnění</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(me.data.modules).map(([mod, level]) => (
            <div key={mod} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
              <span className="text-sm text-slate-600">{MODULE_LABEL[mod] ?? mod}</span>
              <Badge tone={LEVEL_TONE[level] ?? "slate"}>{level}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Připravujeme</SectionTitle>
        <p className="text-sm text-slate-500">Správa uživatelů a pozvánky, pipeline &amp; fáze, custom fields, tagy, integrace (email/chat), notifikace, workflows, GDPR a audit log — přidáme v dalších krocích.</p>
      </Card>
    </div>
  );
}
