"use client";

import { trpc } from "@/ui/trpc";
import { Card, Badge, SectionTitle, Loading } from "@/ui/components/ui";
import { MfaSetup } from "@/ui/components/mfa-setup";
import { PasswordSection } from "@/ui/components/password-section";
import { GdprSection } from "@/ui/components/gdpr-section";
import { ApiKeysSection } from "@/ui/components/api-keys-section";
import { UsersSection } from "@/ui/components/users-section";
import { GoogleSection } from "@/ui/components/google-section";
import { CustomFieldsSection } from "@/ui/components/custom-fields-section";
import { NotificationsSection } from "@/ui/components/notifications-section";

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
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">E-mail</span><span className="font-medium text-ink">{me.data.email}</span></div>
          <div className="flex justify-between"><span className="text-muted">Role</span><span className="font-medium text-ink">{me.data.roles.join(", ") || "—"}</span></div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Moje oprávnění</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(me.data.modules).map(([mod, level]) => (
            <div key={mod} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
              <span className="text-sm text-muted">{MODULE_LABEL[mod] ?? mod}</span>
              <Badge tone={LEVEL_TONE[level] ?? "slate"}>{level}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <UsersSection />

      <GoogleSection />

      <CustomFieldsSection />

      <NotificationsSection />

      <PasswordSection />

      <MfaSetup />

      <ApiKeysSection />

      <GdprSection />

    </div>
  );
}
