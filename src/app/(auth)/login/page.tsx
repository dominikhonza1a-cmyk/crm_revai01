"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Přihlašovací stránka na VAŠÍ doméně. Email + heslo; při zapnutém TOTP MFA přijde krok s 6místným kódem
 * z authenticator appky (Google Authenticator / 1Password). Google OAuth se přidá později (tlačítko).
 * Business logika CRM je jinde — tady jen autentizace přes Supabase.
 */
export default function LoginPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);

    // pokud má uživatel TOTP faktor, Supabase vyžádá druhý krok (aal2)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) { setNeedsMfa(true); return; }
    window.location.href = "/dashboard";
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) return setError("Není nastaven TOTP faktor.");
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (chErr || !challenge) return setError(chErr?.message ?? "Chyba MFA challenge.");
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: challenge.id, code: mfaCode });
    if (vErr) return setError(vErr.message);
    window.location.href = "/dashboard";
  }

  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", fontFamily: "system-ui" }}>
      <h1>revai CRM</h1>
      {!needsMfa ? (
        <form onSubmit={signIn}>
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Přihlásit se</button>
        </form>
      ) : (
        <form onSubmit={verifyMfa}>
          <p>Zadejte kód z authenticator aplikace:</p>
          <input inputMode="numeric" placeholder="123456" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required />
          <button type="submit">Ověřit</button>
        </form>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {/* Fáze později: <button onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}>Přihlásit se Googlem</button> */}
    </main>
  );
}
