"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";

/** API klíče pro Make/n8n (Nastavení, jen admin). Plný klíč se zobrazí jedinkrát při vytvoření. */
export function ApiKeysSection() {
  const utils = trpc.useUtils();
  const keys = trpc.security.listApiKeys.useQuery();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = trpc.security.createApiKey.useMutation({
    onSuccess: async (res) => { setCreatedKey(res.key); setName(""); await utils.security.listApiKeys.invalidate(); },
  });
  const revoke = trpc.security.revokeApiKey.useMutation({
    onSuccess: () => utils.security.listApiKeys.invalidate(),
  });

  return (
    <Card>
      <SectionTitle right={
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
          onClick={() => { setCreatedKey(null); setModal(true); }}>+ Nový klíč</button>
      }>API klíče (Make / n8n)</SectionTitle>

      <p className="mb-3 text-sm text-muted">REST API na <code className="text-faint">/api/v1/…</code> pro napojení externích automatizací. Návod: <code className="text-faint">docs/integrations/rest-api.md</code>.</p>

      {keys.isLoading ? <p className="text-sm text-faint">Načítám…</p>
        : !keys.data?.length ? <p className="text-sm text-faint">Zatím žádné klíče.</p>
        : (
          <ul className="divide-y divide-line">
            {keys.data.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <span className="text-ink">{k.name}</span>
                  <span className="ml-2 font-mono text-xs text-faint">{k.prefix}…</span>
                  {k.revokedAt ? <Badge tone="red">odvolán</Badge> : <Badge tone="green">aktivní</Badge>}
                  {k.lastUsedAt && <span className="ml-2 text-xs text-faint">naposledy {new Date(k.lastUsedAt).toLocaleString("cs-CZ")}</span>}
                </div>
                {!k.revokedAt && (
                  <button className="text-xs text-red-300 hover:underline" disabled={revoke.isPending}
                    onClick={() => revoke.mutate({ id: k.id })}>Odvolat</button>
                )}
              </li>
            ))}
          </ul>
        )}

      {modal && (
        <Modal title={createdKey ? "Klíč vytvořen — zkopíruj TEĎ" : "Nový API klíč"} onClose={() => setModal(false)}>
          {!createdKey ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ name }); }}>
              <div><label className={fieldLabel}>Název (k čemu slouží) *</label>
                <input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="např. n8n produkce" required autoFocus /></div>
              {create.error && <p className="text-sm text-red-300">{formatError(create.error.message)}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className={btnGhost} onClick={() => setModal(false)}>Zrušit</button>
                <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Vytvářím…" : "Vytvořit"}</button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">Tohle je <b className="text-ink">jediný okamžik</b>, kdy klíč uvidíš celý — ulož si ho do 1Password/n8n hned:</p>
              <code className="block select-all break-all rounded-xl border border-line bg-surface-2 p-3 font-mono text-sm text-accent">{createdKey}</code>
              <div className="flex justify-end gap-2">
                <button className={btnGhost} onClick={() => { navigator.clipboard.writeText(createdKey); setCopied(true); }}>{copied ? "Zkopírováno ✓" : "Kopírovat"}</button>
                <button className={btnPrimary} onClick={() => setModal(false)}>Hotovo</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </Card>
  );
}
