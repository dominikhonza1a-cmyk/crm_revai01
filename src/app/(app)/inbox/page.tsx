"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/ui/trpc";
import { Card, Badge, Loading, Empty, Modal, btnGhost } from "@/ui/components/ui";

type FeedItem = {
  id: string; eventType: string; title: string; occurredAt: Date | string;
  payload: unknown; organizationId: string | null; orgName: string;
};

/** Pošta — e-maily z mé schránky spárované s klienty. Klik → detail s náhledem. */
export default function InboxPage() {
  const feed = trpc.integrations.emailFeed.useQuery({ mine: true });
  const [detail, setDetail] = useState<FeedItem | null>(null);

  if (feed.isLoading) return <Loading />;
  const items = (feed.data?.items ?? []) as FeedItem[];

  const dayOf = (d: Date | string) => new Date(d).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
  const groups = new Map<string, FeedItem[]>();
  for (const it of items) {
    const k = dayOf(it.occurredAt);
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {!feed.data?.myEmail && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Nemáš připojený Google účet — připoj ho v <Link href="/settings" className="underline">Nastavení</Link>.
        </p>
      )}

      {!items.length ? (
        <Empty doodle="/doodles/envelope.svg">Zatím žádné spárované e-maily</Empty>
      ) : (
        [...groups.entries()].map(([day, list]) => (
          <div key={day}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">{day}</h2>
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-line">
                {list.map((e) => {
                  const pl = (e.payload ?? {}) as { from?: string; to?: string; snippet?: string };
                  return (
                    <li key={e.id}>
                      <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5" onClick={() => setDetail(e)}>
                        <Badge tone={e.eventType === "email_out" ? "blue" : "green"}>{e.eventType === "email_out" ? "↗ odeslaný" : "↘ přijatý"}</Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{e.title.replace(/^📧 /, "")}</span>
                          <span className="block truncate text-xs text-faint">{pl.snippet || (e.eventType === "email_out" ? `komu: ${pl.to ?? "?"}` : `od: ${pl.from ?? "?"}`)}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">{e.orgName}</span>
                        <span className="shrink-0 text-xs text-faint">{new Date(e.occurredAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))
      )}

      {detail && <EmailDetailModal item={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function EmailDetailModal({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const pl = (item.payload ?? {}) as { from?: string; to?: string; date?: string; snippet?: string; gmailId?: string };
  const subject = item.title.replace(/^📧 /, "");
  const gmailHref = pl.gmailId
    ? `https://mail.google.com/mail/u/0/#all/${pl.gmailId}`
    : `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`subject:"${subject}"`)}`;

  return (
    <Modal title={subject} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="space-y-1.5">
          <div className="flex gap-2"><span className="w-14 shrink-0 text-faint">Od</span><span className="text-ink">{pl.from ?? "—"}</span></div>
          <div className="flex gap-2"><span className="w-14 shrink-0 text-faint">Komu</span><span className="text-ink">{pl.to ?? "—"}</span></div>
          <div className="flex gap-2"><span className="w-14 shrink-0 text-faint">Datum</span><span className="text-ink">{pl.date ?? new Date(item.occurredAt).toLocaleString("cs-CZ")}</span></div>
          <div className="flex gap-2"><span className="w-14 shrink-0 text-faint">Klient</span>
            {item.organizationId
              ? <Link href={`/clients/${item.organizationId}`} className="text-accent hover:underline" onClick={onClose}>{item.orgName}</Link>
              : <span className="text-ink">{item.orgName}</span>}
          </div>
        </div>

        {pl.snippet
          ? <p className="rounded-xl bg-white/5 px-3.5 py-3 leading-relaxed text-muted">{pl.snippet}…</p>
          : <p className="rounded-xl border border-dashed border-line px-3.5 py-3 text-xs text-faint">Náhled textu je dostupný u e-mailů synchronizovaných od teď — starší mají jen předmět. Celé vlákno otevřeš v Gmailu.</p>}

        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={onClose}>Zavřít</button>
          <a className="rounded-xl bg-accent-strong px-3.5 py-2 text-sm font-semibold text-[#08110c] transition-all hover:brightness-110"
            href={gmailHref} target="_blank" rel="noreferrer">Otevřít v Gmailu ↗</a>
        </div>
      </div>
    </Modal>
  );
}
