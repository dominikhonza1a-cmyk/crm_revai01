"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty } from "@/ui/components/ui";

/**
 * Pošta — historie e-mailů spárovaných s klienty (z Google syncu obou schránek).
 * „Moje" = jen e-maily z mé připojené schránky; „Vše" = obě schránky.
 */
export default function InboxPage() {
  const [mine, setMine] = useState(true);
  const feed = trpc.integrations.emailFeed.useQuery({ mine });

  if (feed.isLoading) return <Loading />;
  const items = feed.data?.items ?? [];

  const dayOf = (d: Date | string) => new Date(d).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const k = dayOf(it.occurredAt);
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          E-maily spárované s klienty{feed.data?.myEmail ? <> — tvá schránka: <span className="text-ink">{feed.data.myEmail}</span></> : ""}. Plné znění je v Gmailu; tady vidíš, co se s kým děje.
        </p>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {[{ v: true, l: "Moje" }, { v: false, l: "Vše (oba)" }].map((t) => (
            <button key={t.l} onClick={() => setMine(t.v)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${mine === t.v ? "bg-accent-strong text-[#08110c]" : "text-muted hover:text-ink"}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {!feed.data?.myEmail && mine && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Nemáš připojený Google účet — připoj ho v <Link href="/settings" className="underline">Nastavení</Link>, ať se sem stahují tvoje e-maily.
        </p>
      )}

      {!items.length ? (
        <Empty doodle="/doodles/envelope.svg">
          Zatím žádné spárované e-maily. Párují se jen zprávy s klienty v CRM (dle kontaktů a webu klienta), sync běží à 5 minut.
        </Empty>
      ) : (
        [...groups.entries()].map(([day, list]) => (
          <div key={day}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">{day}</h2>
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-line">
                {list.map((e) => {
                  const pl = (e.payload ?? {}) as { from?: string; to?: string; via?: string };
                  return (
                    <li key={e.id}>
                      <Link href={`/clients/${e.organizationId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                        <Badge tone={e.eventType === "email_out" ? "blue" : "green"}>{e.eventType === "email_out" ? "↗ odeslaný" : "↘ přijatý"}</Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{e.title.replace(/^📧 /, "")}</span>
                          <span className="block truncate text-xs text-faint">{e.eventType === "email_out" ? `komu: ${pl.to ?? "?"}` : `od: ${pl.from ?? "?"}`}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">{e.orgName}</span>
                        <span className="shrink-0 text-xs text-faint">{new Date(e.occurredAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
