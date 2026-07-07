"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Přihlášení na vlastní doméně. Email + heslo; při zapnutém TOTP MFA přijde krok s kódem z authenticator appky.
 * Google OAuth se přidá později. Business logika CRM je jinde — tady jen autentizace přes Supabase.
 */
export default function LoginPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) { setNeedsMfa(true); return; }
      window.location.href = "/dashboard";
    } finally { setBusy(false); }
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (!totp) { setError("Není nastaven TOTP faktor."); return; }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (chErr || !ch) { setError(chErr?.message ?? "Chyba MFA."); return; }
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: mfaCode });
      if (vErr) { setError(vErr.message); return; }
      window.location.href = "/dashboard";
    } finally { setBusy(false); }
  }

  const input = "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft";
  const btn = "w-full rounded-xl bg-accent-strong px-3 py-2.5 text-sm font-semibold text-[#08110c] transition-all hover:brightness-110 disabled:opacity-60";

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-strong text-lg font-bold text-[#08110c]">r</div>
          <span className="text-xl font-semibold tracking-tight text-ink">revai CRM</span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/20">
          {!needsMfa ? (
            <form onSubmit={signIn} className="space-y-3">
              <h1 className="text-sm font-medium text-muted">Přihlaste se</h1>
              <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              <input className={input} type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button className={btn} type="submit" disabled={busy}>{busy ? "Přihlašuji…" : "Přihlásit se"}</button>
            </form>
          ) : (
            <form onSubmit={verifyMfa} className="space-y-3">
              <h1 className="text-sm font-medium text-muted">Zadejte kód z authenticator aplikace</h1>
              <input className={`${input} text-center tracking-[0.3em]`} inputMode="numeric" placeholder="123456" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required autoFocus />
              <button className={btn} type="submit" disabled={busy}>{busy ? "Ověřuji…" : "Ověřit"}</button>
            </form>
          )}
          {error && <p className="mt-3 rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
