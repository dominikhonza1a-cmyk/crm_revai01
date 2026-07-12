"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";

/** Editace stávajícího klienta (název, web, odvětví, velikost, stav vztahu). */
export function EditClientModal({ org, onClose }: {
  org: { id: string; name: string; website: string | null; industry: string | null; employeeBand: string | null; lifecycleStage: string };
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [website, setWebsite] = useState(org.website ?? "");
  const [industry, setIndustry] = useState(org.industry ?? "");
  const [employeeBand, setEmployeeBand] = useState(org.employeeBand ?? "");
  const [lifecycle, setLifecycle] = useState(org.lifecycleStage);

  const update = trpc.organizations.update.useMutation({
    onSuccess: async () => { await Promise.all([utils.organizations.get.invalidate({ id: org.id }), utils.organizations.list.invalidate()]); onClose(); },
  });
  const removeOrg = trpc.organizations.remove.useMutation({
    onSuccess: async () => { await utils.organizations.list.invalidate(); onClose(); router.push("/clients"); },
  });

  return (
    <Modal title="Upravit klienta" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          id: org.id, name,
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          employeeBand: (employeeBand || undefined) as never,
          lifecycleStage: lifecycle as never,
        });
      }}>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={fieldLabel}>Web</label><input className={fieldInput} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.klient.cz" /></div>
          <div><label className={fieldLabel}>Odvětví</label><input className={fieldInput} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="zdravotnictví…" /></div>
          <div><label className={fieldLabel}>Velikost</label>
            <select className={fieldInput} value={employeeBand} onChange={(e) => setEmployeeBand(e.target.value)}>
              <option value="">—</option><option value="1_49">1–49</option><option value="50_199">50–199</option>
              <option value="200_500">200–500</option><option value="500_plus">500+</option>
            </select></div>
          <div><label className={fieldLabel}>Stav vztahu</label>
            <select className={fieldInput} value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}>
              <option value="prospect">Prospekt</option><option value="active_client">Aktivní klient</option>
              <option value="past_client">Bývalý klient</option><option value="partner">Partner</option>
            </select></div>
        </div>
        {(update.error || removeOrg.error) && <p className="text-sm text-red-300">{formatError((update.error ?? removeOrg.error)?.message)}</p>}
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-red-300 hover:underline" disabled={removeOrg.isPending}
            onClick={() => { if (confirm(`Smazat klienta „${org.name}" včetně jeho kontaktů, dealů, projektů a úkolů?`)) removeOrg.mutate({ id: org.id }); }}>
            Smazat klienta
          </button>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
            <button type="submit" className={btnPrimary} disabled={update.isPending}>{update.isPending ? "Ukládám…" : "Uložit"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Editace dealu z kanbanu (název, částka, očekávané uzavření) + odkaz na klienta. */
export function EditDealModal({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const deal = trpc.deals.get.useQuery({ id: dealId });
  const [title, setTitle] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const update = trpc.deals.update.useMutation({
    onSuccess: async () => { await Promise.all([utils.deals.list.invalidate(), utils.deals.get.invalidate({ id: dealId }), utils.reporting.dashboard.invalidate()]); onClose(); },
  });
  const removeDeal = trpc.deals.remove.useMutation({
    onSuccess: async () => { await Promise.all([utils.deals.list.invalidate(), utils.reporting.dashboard.invalidate()]); onClose(); },
  });

  if (deal.isLoading || !deal.data) return <Modal title="Upravit deal" onClose={onClose}><p className="text-sm text-faint">Načítám…</p></Modal>;
  const d = deal.data;
  const titleVal = title ?? d.title;
  const amountVal = amount ?? (d.amountMinor != null ? String(Number(d.amountMinor) / 100) : "");
  const closeVal = closeDate ?? (d.expectedCloseDate ?? "");

  return (
    <Modal title="Upravit deal" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        const trimmed = amountVal.trim();
        const n = parseFloat(trimmed.replace(",", "."));
        if (trimmed && Number.isNaN(n)) { setAmountError("Zadej číslo, nebo pole nech prázdné."); return; }
        setAmountError(null);
        update.mutate({
          id: dealId, title: titleVal,
          amountMinor: trimmed ? BigInt(Math.round(n * 100)) : null,   // prázdné = vymazat
          expectedCloseDate: closeVal || null,
        });
      }}>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={titleVal} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={fieldLabel}>Hodnota (Kč)</label><input className={fieldInput} inputMode="decimal" value={amountVal} onChange={(e) => { setAmount(e.target.value); setAmountError(null); }} placeholder="prázdné = bez hodnoty" />
            {amountError && <p className="mt-1 text-xs text-red-300">{amountError}</p>}</div>
          <div><label className={fieldLabel}>Očekávané uzavření</label><input className={fieldInput} type="date" value={closeVal} onChange={(e) => setCloseDate(e.target.value)} /></div>
        </div>
        <p className="text-xs text-faint">
          Fázi měníš přetažením na kanbanu. Poznámky a historie jsou na kartě klienta —{" "}
          <Link className="text-accent hover:underline" href={`/clients/${d.organizationId}`} onClick={onClose}>otevřít klienta →</Link>
        </p>
        {(update.error || removeDeal.error) && <p className="text-sm text-red-300">{formatError((update.error ?? removeDeal.error)?.message)}</p>}
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-red-300 hover:underline" disabled={removeDeal.isPending}
            onClick={() => { if (confirm(`Smazat deal „${titleVal}"?`)) removeDeal.mutate({ id: dealId }); }}>
            Smazat deal
          </button>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
            <button type="submit" className={btnPrimary} disabled={update.isPending}>{update.isPending ? "Ukládám…" : "Uložit"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
