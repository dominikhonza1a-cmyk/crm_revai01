"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Empty, Modal, fieldInput, btnPrimary, btnGhost } from "./ui";

/** GDPR nástroje v Nastavení: retenční kandidáti + export/výmaz na žádost subjektu (jen admin). */
export function GdprSection() {
  const utils = trpc.useUtils();
  const candidates = trpc.gdpr.retentionCandidates.useQuery();
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const found = trpc.gdpr.findContact.useQuery({ email: searched ?? "" }, { enabled: !!searched });
  const [confirmErase, setConfirmErase] = useState<null | { id: string; label: string }>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportContact = trpc.gdpr.exportContact.useMutation({
    onSuccess: (res) => {
      const blob = new Blob([JSON.stringify(res.bundle, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "gdpr-export.json";
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg("Export stažen (a zapsán do audit logu).");
    },
  });

  const eraseContact = trpc.gdpr.eraseContact.useMutation({
    onSuccess: async (res) => {
      setConfirmErase(null);
      setMsg(res.documentsToDeleteExternally.length
        ? `Kontakt anonymizován. Pozor: ${res.documentsToDeleteExternally.length} souborů je nutné smazat ručně v externím úložišti (vznikl úkol).`
        : "Kontakt anonymizován (kaskáda proběhla, zapsáno do audit logu).");
      await Promise.all([utils.gdpr.retentionCandidates.invalidate(), utils.contacts.list.invalidate(), searched ? utils.gdpr.findContact.invalidate() : Promise.resolve()]);
    },
  });

  const rowBtns = (id: string, label: string) => (
    <div className="flex gap-2">
      <button className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:border-accent/40 hover:text-accent"
        onClick={() => exportContact.mutate({ contactId: id })} disabled={exportContact.isPending}>Export</button>
      <button className="rounded-lg border border-red-400/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-400/10"
        onClick={() => setConfirmErase({ id, label })} disabled={eraseContact.isPending}>Anonymizovat</button>
    </div>
  );

  return (
    <Card>
      <SectionTitle right={<Badge tone="blue">jen admin</Badge>}>GDPR — retence a práva subjektů</SectionTitle>

      <p className="mb-3 text-sm text-muted">Kontakty bez aktivity déle než <b>18 měsíců</b> (kandidáti na anonymizaci — nic se nemaže automaticky):</p>
      {candidates.isLoading ? <p className="text-sm text-faint">Načítám…</p>
        : !candidates.data?.length ? <Empty>Žádní kandidáti — vše v retenčních lhůtách 👍</Empty>
        : (
          <ul className="divide-y divide-line">
            {candidates.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <span className="text-ink">{c.firstName} {c.lastName}</span>
                  <span className="ml-2 text-faint">{c.email ?? "bez e-mailu"} · naposledy {new Date(c.lastActivityAt ?? c.createdAt).toLocaleDateString("cs-CZ")}</span>
                </div>
                {rowBtns(c.id, `${c.firstName} ${c.lastName}`)}
              </li>
            ))}
          </ul>
        )}

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-sm text-muted">Žádost subjektu (export / výmaz) — najdi kontakt podle e-mailu:</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearched(email); }}>
          <input className={fieldInput} type="email" placeholder="osoba@firma.cz" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className={btnPrimary}>Hledat</button>
        </form>
        {searched && found.data === null && <p className="mt-2 text-sm text-faint">Kontakt s tímto e-mailem neexistuje.</p>}
        {found.data && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
            <span className="text-sm text-ink">{found.data.firstName} {found.data.lastName} <span className="text-faint">· {found.data.email}</span>
              {found.data.anonymizedAt && <Badge tone="slate">už anonymizován</Badge>}</span>
            {!found.data.anonymizedAt && rowBtns(found.data.id, `${found.data.firstName} ${found.data.lastName}`)}
          </div>
        )}
      </div>

      {msg && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{msg}</p>}
      {(exportContact.error || eraseContact.error) && <p className="mt-3 rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-300">{(exportContact.error ?? eraseContact.error)?.message}</p>}

      {confirmErase && (
        <Modal title="Anonymizovat kontakt?" onClose={() => setConfirmErase(null)}>
          <p className="text-sm text-muted">
            Kontakt <b className="text-ink">{confirmErase.label}</b> bude nevratně anonymizován: osobní údaje se smažou,
            aktivity a timeline se vyčistí, dokumenty s PII se odpojí. Akce se zapíše do audit logu.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setConfirmErase(null)}>Zrušit</button>
            <button className="rounded-xl bg-red-400/90 px-4 py-2.5 text-sm font-semibold text-[#1a0b0b] hover:brightness-110 disabled:opacity-60"
              disabled={eraseContact.isPending}
              onClick={() => eraseContact.mutate({ contactId: confirmErase.id })}>
              {eraseContact.isPending ? "Provádím…" : "Ano, anonymizovat"}
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
