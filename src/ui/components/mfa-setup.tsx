"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, SectionTitle, Badge, fieldInput, btnPrimary, btnGhost } from "./ui";

/**
 * Nastavení dvoufaktoru (TOTP): spárování authenticator aplikace (Google Authenticator / 1Password / Authy).
 * Enroll → QR kód → ověření 6místným kódem → faktor aktivní. Při dalším přihlášení Supabase vyžádá kód.
 */
type Factor = { id: string; friendly_name?: string | null; status: string };

export function MfaSetup() {
  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<null | { factorId: string; qr: string; secret: string }>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<null | { ok: boolean; text: string }>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }
  useEffect(() => { void refresh(); }, []);

  async function startEnroll() {
    setMsg(null); setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator" });
      if (error || !data) { setMsg({ ok: false, text: error?.message ?? "Enroll selhal." }); return; }
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setMsg(null); setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (chErr || !ch) { setMsg({ ok: false, text: chErr?.message ?? "Chyba ověření." }); return; }
      const { error } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code });
      if (error) { setMsg({ ok: false, text: error.message }); return; }
      setEnroll(null); setCode("");
      setMsg({ ok: true, text: "Dvoufaktor je aktivní ✅ Při příštím přihlášení budeš zadávat kód z aplikace." });
      await refresh();
    } finally { setBusy(false); }
  }

  async function remove(factorId: string) {
    setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) { setMsg({ ok: false, text: error.message }); return; }
      setMsg({ ok: true, text: "Dvoufaktor byl vypnut." });
      await refresh();
    } finally { setBusy(false); }
  }

  const active = factors.filter((f) => f.status === "verified");

  return (
    <Card>
      <SectionTitle right={active.length ? <Badge tone="green">aktivní</Badge> : <Badge tone="amber">vypnuto</Badge>}>
        Dvoufaktorové přihlášení (MFA)
      </SectionTitle>

      {!enroll && active.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Druhý faktor přes authenticator aplikaci v telefonu (Google Authenticator, 1Password, Authy). Doporučeno zapnout.</p>
          <button className={btnPrimary} onClick={startEnroll} disabled={busy}>{busy ? "Připravuji…" : "Zapnout MFA"}</button>
        </div>
      )}

      {!enroll && active.length > 0 && (
        <div className="space-y-2">
          {active.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5">
              <span className="text-sm text-ink">{f.friendly_name ?? "Authenticator"}</span>
              <button className="text-xs text-red-300 hover:underline" onClick={() => remove(f.id)} disabled={busy}>Vypnout</button>
            </div>
          ))}
        </div>
      )}

      {enroll && (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-muted">1) Naskenuj QR kód v authenticator aplikaci:</p>
          <div className="grid place-items-center rounded-xl bg-white p-4">
            {/* qr_code je SVG data URI ze Supabase */}
            <img src={enroll.qr} alt="MFA QR kód" width={180} height={180} />
          </div>
          <p className="text-xs text-faint">Nejde skenovat? Zadej ručně klíč: <code className="select-all text-muted">{enroll.secret}</code></p>
          <p className="text-sm text-muted">2) Zadej 6místný kód z aplikace:</p>
          <input className={`${fieldInput} text-center tracking-[0.3em]`} inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => { setEnroll(null); setCode(""); }}>Zrušit</button>
            <button type="submit" className={btnPrimary} disabled={busy || code.length < 6}>{busy ? "Ověřuji…" : "Aktivovat"}</button>
          </div>
        </form>
      )}

      {msg && <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-accent-soft text-accent" : "bg-red-400/10 text-red-300"}`}>{msg.text}</p>}
    </Card>
  );
}
