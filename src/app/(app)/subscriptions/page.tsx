"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Modal, Loading, Empty, money, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "@/ui/components/ui";
import { Select } from "@/ui/components/select";

type EditState = { id?: string; name: string; purpose: string; email: string; password: string; url: string; amount: string; currency: "USD" | "EUR" | "CZK" | "GBP"; period: "monthly" | "yearly" | "one_off"; paidOn: string; notes: string } | null;

const EMPTY: NonNullable<EditState> = { name: "", purpose: "", email: "", password: "", url: "", amount: "", currency: "USD", period: "monthly", paidOn: new Date().toISOString().slice(0, 10), notes: "" };

/** Předplatná — sdílená tabulka fixních nákladů (co, k čemu, účet, kolik; CZK přepočet dle ČNB). */
export default function SubscriptionsPage() {
  const utils = trpc.useUtils();
  const list = trpc.subscriptions.list.useQuery();
  const [edit, setEdit] = useState<EditState>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));   // jednorázové dle měsíce

  const refresh = () => Promise.all([utils.subscriptions.list.invalidate(), utils.reporting.dashboard.invalidate()]);
  const create = trpc.subscriptions.create.useMutation({ onSuccess: async () => { setEdit(null); await refresh(); } });
  const update = trpc.subscriptions.update.useMutation({ onSuccess: async () => { setEdit(null); await refresh(); } });
  const remove = trpc.subscriptions.remove.useMutation({ onSuccess: refresh });
  const reveal = trpc.subscriptions.revealPassword.useMutation();

  if (list.isLoading) return <Loading />;
  const items = list.data?.items ?? [];
  const recurring = items.filter((s) => s.period !== "one_off");
  const oneOffAll = items.filter((s) => s.period === "one_off");
  const oneOff = oneOffAll.filter((s) => (s.paidOn ?? "").slice(0, 7) === month);
  const oneOffMonthCzk = oneOff.reduce((a, s) => a + Number(s.czkMinor), 0);
  const monthLabel = new Date(`${month}-01`).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const shiftMonth = (d: number) => {
    const [y, m] = month.split("-").map(Number);
    const nd = new Date(Date.UTC(y!, m! - 1 + d, 1));
    setMonth(nd.toISOString().slice(0, 7));
  };
  const isThisMonth = month === new Date().toISOString().slice(0, 7);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const payload = {
      name: edit.name, purpose: edit.purpose || undefined, email: edit.email || undefined,
      password: edit.password || undefined, url: edit.url || undefined,
      amountMinor: BigInt(Math.round((parseFloat(edit.amount.replace(",", ".")) || 0) * 100)),
      currency: edit.currency, period: edit.period, paidOn: edit.period === "one_off" ? edit.paidOn : undefined, notes: edit.notes || undefined,
    };
    if (edit.id) update.mutate({ id: edit.id, ...payload });
    else create.mutate(payload);
  };

  const showPassword = async (id: string) => {
    if (revealed[id]) { setRevealed((r) => { const { [id]: _, ...rest } = r; return rest; }); return; }
    const res = await reveal.mutateAsync({ id });
    if (res.password) setRevealed((r) => ({ ...r, [id]: res.password! }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Pravidelná předplatná a jednorázové výdaje.</p>
        <button className={btnPrimary + " shrink-0 whitespace-nowrap"} onClick={() => setEdit({ ...EMPTY })}>+ Nový náklad</button>
      </div>

      {!items.length ? (
        <Empty doodle="/doodles/card.svg">Zatím žádné náklady</Empty>
      ) : (
        <>
        <Card>
          <SectionTitle right={<span className="font-display text-xl tracking-wide text-ink">{money(Number(list.data!.totalMonthlyCzkMinor))} <span className="text-xs font-sans tracking-normal text-faint">/ měsíc</span></span>}>
            Fixní předplatná
          </SectionTitle>
          {!recurring.length ? <p className="text-sm text-faint">Žádná pravidelná předplatná</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3">Co</th><th className="py-2 pr-3">K čemu</th><th className="py-2 pr-3">Účet</th>
                  <th className="py-2 pr-3">Heslo</th><th className="py-2 pr-3 text-right">Částka</th><th className="py-2 pr-3 text-right">CZK/měs</th><th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recurring.map((s) => <SubRow key={s.id} s={s} revealed={revealed} showPassword={showPassword} revealPending={reveal.isPending} onEdit={setEdit} onRemove={(id, name) => { if (confirm(`Smazat ${name}?`)) remove.mutate({ id }); }} removePending={remove.isPending} />)}
              </tbody>
            </table>
          </div>
          )}
        </Card>

        <Card>
          <SectionTitle right={
            <span className="flex items-center gap-3">
              <span className="font-display text-xl tracking-wide text-ink">{money(oneOffMonthCzk)}</span>
              <span className="inline-flex items-center rounded-xl border border-line bg-surface">
                <button className="px-2.5 py-1 text-muted hover:text-ink" onClick={() => shiftMonth(-1)}>‹</button>
                <span className="px-1 text-xs font-medium text-ink">{monthLabel}{isThisMonth ? "" : ""}</span>
                <button className="px-2.5 py-1 text-muted hover:text-ink disabled:opacity-30" onClick={() => shiftMonth(1)} disabled={isThisMonth}>›</button>
              </span>
            </span>
          }>
            Jednorázové výdaje
          </SectionTitle>
          {!oneOff.length ? <p className="text-sm text-faint">V tomto měsíci žádné jednorázové výdaje</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {oneOff.map((s) => <SubRow key={s.id} s={s} revealed={revealed} showPassword={showPassword} revealPending={reveal.isPending} onEdit={setEdit} onRemove={(id, name) => { if (confirm(`Smazat ${name}?`)) remove.mutate({ id }); }} removePending={remove.isPending} />)}
              </tbody>
            </table>
          </div>
          )}
          {isThisMonth && <p className="mt-3 text-xs text-faint">Výdaje tohoto měsíce na dashboardu = {money(Number(list.data!.totalMonthlyCzkMinor) + oneOffMonthCzk)} (fixní + jednorázové)</p>}
        </Card>
        </>
      )}

      {edit && (
        <Modal title={edit.id ? "Upravit náklad" : "Nový náklad (předplatné / jednorázový)"} onClose={() => setEdit(null)}>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={fieldLabel}>Co *</label><input className={fieldInput} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Claude Max" required autoFocus /></div>
              <div><label className={fieldLabel}>K čemu</label><input className={fieldInput} value={edit.purpose} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })} placeholder="vývoj, agenti" /></div>
              <div><label className={fieldLabel}>E-mail účtu</label><input className={fieldInput} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
              <div><label className={fieldLabel}>Heslo {edit.id && <span className="text-faint">(prázdné = beze změny)</span>}</label><input className={fieldInput} type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></div>
              <div><label className={fieldLabel}>Částka *</label><input className={fieldInput} inputMode="decimal" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} placeholder="20" required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={fieldLabel}>Měna</label>
                  <Select value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v as never })}
                    options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "CZK", label: "CZK" }, { value: "GBP", label: "GBP" }]} /></div>
                <div><label className={fieldLabel}>Období</label>
                  <Select value={edit.period} onChange={(v) => setEdit({ ...edit, period: v as never })}
                    options={[{ value: "monthly", label: "měsíčně" }, { value: "yearly", label: "ročně" }, { value: "one_off", label: "jednorázově" }]} /></div>
              </div>
              {edit.period === "one_off" && (
                <div><label className={fieldLabel}>Zaplaceno dne *</label>
                  <input className={fieldInput} type="date" value={edit.paidOn} onChange={(e) => setEdit({ ...edit, paidOn: e.target.value })} required /></div>
              )}
              <div><label className={fieldLabel}>Web</label><input className={fieldInput} value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="claude.ai" /></div>
              <div><label className={fieldLabel}>Poznámky</label><input className={fieldInput} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            </div>
            <p className="text-xs text-faint">Heslo se ukládá šifrovaně (AES-256) a zobrazí se jen na kliknutí — každé zobrazení se zapisuje do audit logu.</p>
            {(create.error || update.error) && <p className="text-sm text-red-300">{formatError((create.error ?? update.error)?.message)}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setEdit(null)}>Zrušit</button>
              <button type="submit" className={btnPrimary} disabled={create.isPending || update.isPending}>{edit.id ? "Uložit" : "Přidat"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

type SubItem = {
  id: string; name: string; purpose: string | null; email: string | null; url: string | null;
  amountMinor: bigint; currency: string; period: string; paidOn: string | null; notes: string | null;
  status: string; hasPassword: boolean; monthlyCzkMinor: bigint; czkMinor: bigint;
};

/** Řádek nákladu — sdílený pro fixní i jednorázové. */
function SubRow({ s, revealed, showPassword, revealPending, onEdit, onRemove, removePending }: {
  s: SubItem;
  revealed: Record<string, string>;
  showPassword: (id: string) => void;
  revealPending: boolean;
  onEdit: (e: { id: string; name: string; purpose: string; email: string; password: string; url: string; amount: string; currency: "USD" | "EUR" | "CZK" | "GBP"; period: "monthly" | "yearly" | "one_off"; paidOn: string; notes: string }) => void;
  onRemove: (id: string, name: string) => void;
  removePending: boolean;
}) {
  return (
    <tr className="hover:bg-white/5">
      <td className="py-2.5 pr-3">
        <span className="font-medium text-ink">{s.name}</span>
        {s.status === "canceled" && <Badge tone="slate">zrušené</Badge>}
        {s.url && <a className="ml-1.5 text-xs text-accent hover:underline" href={s.url.startsWith("http") ? s.url : `https://${s.url}`} target="_blank" rel="noreferrer">↗</a>}
        {s.notes && <div className="text-xs text-faint">{s.notes}</div>}
      </td>
      <td className="py-2.5 pr-3 text-muted">{s.purpose ?? "—"}</td>
      <td className="py-2.5 pr-3 text-muted">{s.email ?? "—"}</td>
      <td className="py-2.5 pr-3">
        {!s.hasPassword ? <span className="text-faint">—</span> : revealed[s.id] ? (
          <span className="flex items-center gap-1.5">
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-ink">{revealed[s.id]}</code>
            <button className="text-xs text-faint hover:text-muted" title="Zkopírovat" onClick={() => navigator.clipboard.writeText(revealed[s.id] ?? "")}>⧉</button>
            <button className="text-xs text-faint hover:text-muted" onClick={() => showPassword(s.id)}>skrýt</button>
          </span>
        ) : (
          <button className="text-xs text-accent hover:underline" disabled={revealPending} onClick={() => showPassword(s.id)}>••••• zobrazit</button>
        )}
      </td>
      <td className="py-2.5 pr-3 text-right text-muted">{(Number(s.amountMinor) / 100).toLocaleString("cs-CZ")} {s.currency}{s.period === "one_off" ? ` · ${s.paidOn ? new Date(s.paidOn).toLocaleDateString("cs-CZ") : ""}` : s.period === "yearly" ? "/rok" : "/měs"}</td>
      <td className="py-2.5 pr-3 text-right font-medium text-ink">{s.period === "one_off" ? money(Number(s.czkMinor)) : money(Number(s.monthlyCzkMinor))}</td>
      <td className="py-2.5 text-right">
        <button className="text-xs text-faint hover:text-accent" onClick={() => onEdit({
          id: s.id, name: s.name, purpose: s.purpose ?? "", email: s.email ?? "", password: "",
          url: s.url ?? "", amount: String(Number(s.amountMinor) / 100), currency: s.currency as never, period: s.period as never, paidOn: s.paidOn ?? new Date().toISOString().slice(0, 10), notes: s.notes ?? "",
        })}>Upravit</button>
        <button className="ml-2 rounded-lg px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-400/10 hover:underline" disabled={removePending} onClick={() => onRemove(s.id, s.name)}>Smazat</button>
      </td>
    </tr>
  );
}
