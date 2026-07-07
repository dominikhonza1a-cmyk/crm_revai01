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

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-100";
  const btn = "w-full rounded-lg bg-accent-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-700 disabled:opacity-60";

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-600 text-lg font-bold text-white">r</div>
          <span className="text-xl font-semibold tracking-tight text-slate-800">revai CRM</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!needsMfa ? (
            <form onSubmit={signIn} className="space-y-3">
              <h1 className="text-sm font-medium text-slate-500">Přihlaste se</h1>
              <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              <input className={input} type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button className={btn} type="submit" disabled={busy}>{busy ? "Přihlašuji…" : "Přihlásit se"}</button>
            </form>
          ) : (
            <form onSubmit={verifyMfa} className="space-y-3">
              <h1 className="text-sm font-medium text-slate-500">Zadejte kód z authenticator aplikace</h1>
              <input className={`${input} text-center tracking-[0.3em]`} inputMode="numeric" placeholder="123456" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required autoFocus />
              <button className={btn} type="submit" disabled={busy}>{busy ? "Ověřuji…" : "Ověřit"}</button>
            </form>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
