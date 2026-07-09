"use client";

import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, formatError } from "./ui";

const CATEGORY_LABEL: Record<string, string> = {
  sla_breach: "SLA porušeno (ticket)",
  sla_warning: "SLA varování (blíží se termín)",
  deal_won: "Vyhraný deal 🏆",
  task_assigned: "Přiřazený úkol",
  task_overdue: "Úkol po termínu",
  deal_stage: "Posun dealu v pipeline",
  deal_stale: "Deal bez aktivity (stale)",
  mention: "Zmínka (@)",
  import_finished: "Dokončený import",
  digest: "Denní souhrn",
};
const MODE_LABEL: Record<string, string> = { immediate: "Okamžitě", daily_digest: "Denní souhrn", off: "Vypnuto" };

/** Notifikační preference přihlášeného uživatele (e-mail). Default z configu, přepis per-user. */
export function NotificationsSection() {
  const utils = trpc.useUtils();
  const prefs = trpc.notifications.myPreferences.useQuery();
  const set = trpc.notifications.setPreference.useMutation({ onSuccess: () => utils.notifications.myPreferences.invalidate() });
  const reset = trpc.notifications.resetPreferences.useMutation({ onSuccess: () => utils.notifications.myPreferences.invalidate() });

  return (
    <Card>
      <SectionTitle right={
        <button className="text-xs text-faint hover:text-muted hover:underline" disabled={reset.isPending}
          onClick={() => reset.mutate()}>Obnovit výchozí</button>
      }>Notifikace (e-mail)</SectionTitle>
      <p className="mb-3 text-sm text-muted">Co ti má chodit e-mailem okamžitě, co v denním souhrnu (~7:00) a co vůbec. Platí jen pro tebe.</p>

      {prefs.isLoading ? <p className="text-sm text-faint">Načítám…</p> : (
        <div className="divide-y divide-line">
          {(prefs.data ?? []).filter((p) => p.email.available && p.category !== "digest").map((p) => (
            <div key={p.category} className="flex items-center justify-between gap-3 py-2.5">
              <div className="text-sm text-ink">
                {CATEGORY_LABEL[p.category] ?? p.category}
                {p.severity === "critical" && <Badge tone="amber">kritické</Badge>}
                {p.email.mode !== p.email.default && <Badge tone="blue">upraveno</Badge>}
              </div>
              <select
                className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                value={p.email.mode} disabled={set.isPending}
                onChange={(e) => set.mutate({ category: p.category as never, channel: "email", mode: e.target.value as never })}>
                {Object.entries(MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}{v === p.email.default ? " (výchozí)" : ""}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      {(set.error || reset.error) && <p className="mt-2 text-xs text-red-300">{formatError((set.error ?? reset.error)?.message)}</p>}
    </Card>
  );
}
