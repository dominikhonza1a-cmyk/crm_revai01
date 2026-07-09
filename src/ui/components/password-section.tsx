"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, SectionTitle, fieldInput, fieldLabel, btnPrimary } from "./ui";

/**
 * Nastavení/změna hesla přihlášeného uživatele (Supabase updateUser). Funguje i pro účty
 * pozvané e-mailem (magic link) — tady si poprvé zvolí heslo pro běžné přihlašování.
 */
export function PasswordSection() {
  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw1.length < 8) { setMsg({ ok: false, text: "Heslo musí mít alespoň 8 znaků." }); return; }
    if (pw1 !== pw2) { setMsg({ ok: false, text: "Hesla se neshodují." }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) setMsg({ ok: false, text: error.message });
      else { setMsg({ ok: true, text: "Heslo nastaveno ✅ — příště se přihlásíš e-mailem a tímto heslem." }); setPw1(""); setPw2(""); }
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <SectionTitle>Heslo</SectionTitle>
      <p className="mb-3 text-sm text-muted">Přišel jsi přes pozvánkový odkaz? Tady si nastav heslo pro běžné přihlašování. Slouží i pro změnu hesla.</p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <div><label className={fieldLabel}>Nové heslo (min. 8 znaků)</label>
          <input className={fieldInput} type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" required /></div>
        <div><label className={fieldLabel}>Znovu pro kontrolu</label>
          <input className={fieldInput} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required /></div>
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          {msg ? <p className={`text-sm ${msg.ok ? "text-accent" : "text-red-300"}`}>{msg.text}</p> : <span />}
          <button className={btnPrimary} type="submit" disabled={busy}>{busy ? "Ukládám…" : "Uložit heslo"}</button>
        </div>
      </form>
    </Card>
  );
}
