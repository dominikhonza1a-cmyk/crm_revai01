"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Modal, Loading, Empty, money, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "@/ui/components/ui";

type EditState = { id?: string; name: string; purpose: string; email: string; password: string; url: string; amount: string; currency: "USD" | "EUR" | "CZK" | "GBP"; period: "monthly" | "yearly" | "one_off"; paidOn: string; notes: string } | null;

const EMPTY: NonNullable<EditState> = { name: "", purpose: "", email: "", password: "", url: "", amount: "", currency: "USD", period: "monthly", paidOn: new Date().toISOString().slice(0, 10), notes: "" };

/** Předplatná — sdílená tabulka fixních nákladů (co, k čemu, účet, kolik; CZK přepočet dle ČNB). */
export default function SubscriptionsPage() {
  const utils = trpc.useUtils();
  const list = trpc.subscriptions.list.useQuery();
  const [edit, setEdit] = useState<EditState>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const refresh = () => Promise.all([utils.subscriptions.list.invalidate(), utils.reporting.dashboard.invalidate()]);
  const create = trpc.subscriptions.create.useMutation({ onSuccess: async () => { setEdit(null); await refresh(); } });
  const update = trpc.subscriptions.update.useMutation({ onSuccess: async () => { setEdit(null); await refresh(); } });
  const remove = trpc.subscriptions.remove.useMutation({ onSuccess: refresh });
  const reveal = trpc.subscriptions.revealPassword.useMutation();

  if (list.isLoading) return <Loading />;
  const items = list.data?.items ?? [];

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
        <p className="text-sm text-muted">Vše, co platíme — předplatná i jednorázové výdaje. CZK přepočet denním kurzem ČNB; roční platby = 1/12 měsíčně, jednorázové se počítají do cashflow měsíce, kdy byly zaplacené.</p>
        <button className={btnPrimary} onClick={() => setEdit({ ...EMPTY })}>+ Nový náklad</button>
      </div>

      {!items.length ? (
        <Empty doodle="/doodles/card.svg">Zatím žádná předplatná — přidej první (Claude, GPT, hosting…)</Empty>
      ) : (
        <Card>
          <SectionTitle right={
            <span className="text-right">
              <span className="font-display text-xl tracking-wide text-ink">{money(Number(list.data!.totalMonthlyCzkMinor))} <span className="text-xs font-sans tracking-normal text-faint">/ měsíc fixně</span></span>
              {Number(list.data!.oneOffThisMonthCzkMinor) > 0 && <span className="block text-xs text-faint">+ {money(Number(list.data!.oneOffThisMonthCzkMinor))} jednorázově tento měsíc</span>}
            </span>
          }>
            Náklady
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3">Co</th><th className="py-2 pr-3">K čemu</th><th className="py-2 pr-3">Účet</th>
                  <th className="py-2 pr-3">Heslo</th><th className="py-2 pr-3 text-right">Částka</th><th className="py-2 pr-3 text-right">CZK/měs</th><th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5">
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
                        <button className="text-xs text-accent hover:underline" disabled={reveal.isPending} onClick={() => showPassword(s.id)}>••••• zobrazit</button>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-muted">{(Number(s.amountMinor) / 100).toLocaleString("cs-CZ")} {s.currency}{s.period === "one_off" ? ` · ${s.paidOn ? new Date(s.paidOn).toLocaleDateString("cs-CZ") : "jednorázově"}` : s.period === "yearly" ? "/rok" : "/měs"}</td>
                    <td className="py-2.5 pr-3 text-right font-medium text-ink">{s.period === "one_off" ? <span className="text-faint">jednoráz. {money(Number(s.czkMinor))}</span> : money(Number(s.monthlyCzkMinor))}</td>
                    <td className="py-2.5 text-right">
                      <button className="text-xs text-faint hover:text-accent" onClick={() => setEdit({
                        id: s.id, name: s.name, purpose: s.purpose ?? "", email: s.email ?? "", password: "",
                        url: s.url ?? "", amount: String(Number(s.amountMinor) / 100), currency: s.currency as never, period: s.period as never, paidOn: s.paidOn ?? new Date().toISOString().slice(0, 10), notes: s.notes ?? "",
                      })}>Upravit</button>
                      <button className="ml-2 text-xs text-red-300 hover:underline" disabled={remove.isPending}
                        onClick={() => { if (confirm(`Smazat předplatné ${s.name}?`)) remove.mutate({ id: s.id }); }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
                  <select className={fieldInput} value={edit.currency} onChange={(e) => setEdit({ ...edit, currency: e.target.value as never })}>
                    <option>USD</option><option>EUR</option><option>CZK</option><option>GBP</option>
                  </select></div>
                <div><label className={fieldLabel}>Období</label>
                  <select className={fieldInput} value={edit.period} onChange={(e) => setEdit({ ...edit, period: e.target.value as never })}>
                    <option value="monthly">měsíčně</option><option value="yearly">ročně</option><option value="one_off">jednorázově</option>
                  </select></div>
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
