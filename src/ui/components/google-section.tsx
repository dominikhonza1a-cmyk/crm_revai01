"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, btnPrimary, btnGhost, formatError } from "./ui";

/**
 * Google účet (Gmail + kalendář, jen čtení). Per-user připojení — každý si připojí svůj.
 * E-maily a schůzky se pak automaticky párují na klienty do timeline (sync ~5 min).
 */
export function GoogleSection() {
  const utils = trpc.useUtils();
  const status = trpc.integrations.googleStatus.useQuery();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("google");
    if (q === "connected") setNotice("Google účet připojen ✅ — e-maily a schůzky se začnou párovat na klienty.");
    if (q === "denied") setNotice("Připojení zrušeno — souhlas nebyl udělen.");
    if (q === "error") setNotice("Připojení selhalo — zkus to znovu, případně mi napiš.");
    if (q) window.history.replaceState(null, "", "/settings");
  }, []);

  const connect = trpc.integrations.googleAuthUrl.useMutation({
    onSuccess: (res) => { window.location.href = res.url; },
  });
  const disconnect = trpc.integrations.googleDisconnect.useMutation({
    onSuccess: () => utils.integrations.googleStatus.invalidate(),
  });
  const syncNow = trpc.integrations.googleSyncNow.useMutation({
    onSuccess: async (res) => {
      setNotice(`Synchronizováno: ${res.emails} e-mailů, ${res.events} schůzek (spárované s klienty najdeš v jejich timeline).`);
      await utils.integrations.googleStatus.invalidate();
    },
  });

  const s = status.data;
  return (
    <Card>
      <SectionTitle>Google účet (Gmail + kalendář)</SectionTitle>

      {!s ? <p className="text-sm text-faint">Načítám…</p> : !s.connected ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Připoj svůj Google účet — e-maily a schůzky s klienty se začnou automaticky ukazovat v jejich timeline. Jen čtení, nic neodesíláme.</p>
          <button className={btnPrimary + " shrink-0"} disabled={connect.isPending} onClick={() => connect.mutate()}>
            {connect.isPending ? "…" : "Připojit Google účet"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <span className="text-ink">{s.externalEmail ?? "připojeno"}</span>
              {s.status === "active" ? <Badge tone="green">aktivní</Badge> : <Badge tone="red">chyba — připoj znovu</Badge>}
              {s.lastSyncedAt && <span className="ml-2 text-xs text-faint">poslední sync {new Date(s.lastSyncedAt).toLocaleString("cs-CZ")}</span>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button className={btnGhost} disabled={syncNow.isPending} onClick={() => syncNow.mutate()}>{syncNow.isPending ? "Synchronizuji…" : "Synchronizovat teď"}</button>
              <button className="text-xs text-red-300 hover:underline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>Odpojit</button>
            </div>
          </div>
          {s.status !== "active" && s.lastError && <p className="text-xs text-faint">{s.lastError}</p>}
        </div>
      )}

      {notice && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{notice}</p>}
      {(connect.error || syncNow.error) && <p className="mt-3 rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-300">{formatError((connect.error ?? syncNow.error)?.message)}</p>}
    </Card>
  );
}
