"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Modal, fieldInput, fieldLabel, btnPrimary, btnGhost } from "./ui";

/** Nový klient. */
export function NewClientModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [lifecycleStage, setStage] = useState("prospect");
  const [industry, setIndustry] = useState("");
  const create = trpc.organizations.create.useMutation({
    onSuccess: async () => { await utils.organizations.list.invalidate(); onClose(); },
  });

  return (
    <Modal title="Nový klient" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ name, website: website || undefined, lifecycleStage: lifecycleStage as never, industry: industry || undefined }); }}>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
        <div><label className={fieldLabel}>Web</label><input className={fieldInput} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fieldLabel}>Stav</label>
            <select className={fieldInput} value={lifecycleStage} onChange={(e) => setStage(e.target.value)}>
              <option value="prospect">Prospekt</option><option value="active_client">Klient</option><option value="past_client">Bývalý</option><option value="partner">Partner</option>
            </select>
          </div>
          <div><label className={fieldLabel}>Odvětví</label><input className={fieldInput} value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
        </div>
        {create.error && <p className="text-sm text-red-300">{create.error.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Ukládám…" : "Vytvořit"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Nový deal. */
export function NewDealModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const orgs = trpc.organizations.list.useQuery(undefined);
  const [organizationId, setOrg] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [projectTypeHint, setType] = useState("");
  const create = trpc.deals.create.useMutation({
    onSuccess: async () => { await utils.deals.list.invalidate(); onClose(); },
  });

  return (
    <Modal title="Nový deal" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        create.mutate({
          organizationId, title,
          amountMinor: amount ? BigInt(Math.round(parseFloat(amount.replace(",", ".")) * 100)) : undefined,
          currency: "CZK",
          projectTypeHint: (projectTypeHint || undefined) as never,
        });
      }}>
        <div><label className={fieldLabel}>Klient *</label>
          <select className={fieldInput} value={organizationId} onChange={(e) => setOrg(e.target.value)} required>
            <option value="" disabled>Vyber klienta…</option>
            {orgs.data?.items.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div><label className={fieldLabel}>Název *</label><input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fieldLabel}>Hodnota (Kč)</label><input className={fieldInput} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="250000" /></div>
          <div><label className={fieldLabel}>Typ projektu</label>
            <select className={fieldInput} value={projectTypeHint} onChange={(e) => setType(e.target.value)}>
              <option value="">—</option><option value="chatbot_voicebot">Chatbot/Voicebot</option><option value="process_automation">Automatizace</option><option value="custom_ai">Custom AI</option>
            </select>
          </div>
        </div>
        {create.error && <p className="text-sm text-red-300">{create.error.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Zrušit</button>
          <button type="submit" className={btnPrimary} disabled={create.isPending || !organizationId}>{create.isPending ? "Ukládám…" : "Vytvořit"}</button>
        </div>
      </form>
    </Modal>
  );
}
