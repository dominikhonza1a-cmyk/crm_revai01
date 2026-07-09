"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Nastavení nového hesla po kliknutí na odkaz z e-mailu (zapomenuté heslo / pozvánka).
 * Supabase klient si session vezme z tokenů v URL (detectSessionInUrl).
 */
export default function ResetPasswordPage() {
  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // tokeny z hash zpracuje supabase-js; chvilku počkáme a ověříme session
    const t = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setReady(true);
    }, 400);
    return () => clearTimeout(t);
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw1.length < 8) { setError("Heslo musí mít alespoň 8 znaků."); return; }
    if (pw1 !== pw2) { setError("Hesla se neshodují."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) { setError(error.message); return; }
      window.location.href = "/dashboard";
    } finally { setBusy(false); }
  }

  const input = "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft";
  const btn = "w-full rounded-xl bg-accent-strong px-3 py-2.5 text-sm font-semibold text-[#08110c] transition-all hover:brightness-110 disabled:opacity-60";

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <img src="/doodles/pandulak.png" alt="" width={110} height={110} className="mx-auto mb-1" />
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-strong font-display text-2xl text-[#08110c]">R</div>
          <span className="font-display text-3xl tracking-wider text-ink">REVAI CRM</span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/20">
          {!ready ? (
            <p className="text-center text-sm text-faint">Ověřuji odkaz…</p>
          ) : !hasSession ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-red-300">Odkaz je neplatný nebo vypršel.</p>
              <a className="text-sm text-accent hover:underline" href="/login">Zpět na přihlášení</a>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <h1 className="text-sm font-medium text-muted">Zvol si nové heslo</h1>
              <input className={input} type="password" placeholder="Nové heslo (min. 8 znaků)" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" required autoFocus />
              <input className={input} type="password" placeholder="Znovu pro kontrolu" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
              <button className={btn} type="submit" disabled={busy}>{busy ? "Ukládám…" : "Nastavit heslo a vstoupit"}</button>
              {error && <p className="rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
