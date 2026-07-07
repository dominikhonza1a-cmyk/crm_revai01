"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Dočasný minimální dashboard — potvrzení, že přihlášení + RBAC funguje end-to-end.
 * Plné obrazovky (klienti, dealy, projekty, tasky, timeline) přijdou v UI fázi.
 */
interface Me { email: string; roles: string[]; modules: Record<string, string> }

export default function DashboardPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const [state, setState] = useState<{ loading: boolean; me?: Me; error?: string }>({ loading: true });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const res = await fetch("/api/trpc/me", { headers: { authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (json?.error) { setState({ loading: false, error: json.error?.message ?? "Neznámá chyba" }); return; }
      setState({ loading: false, me: json?.result?.data });
    })().catch((e) => setState({ loading: false, error: String(e) }));
  }, []);

  const box: React.CSSProperties = { maxWidth: 640, margin: "8vh auto", fontFamily: "system-ui", lineHeight: 1.6 };
  if (state.loading) return <main style={box}>Načítám…</main>;
  if (state.error) return <main style={box}><h1>revai CRM</h1><p style={{ color: "crimson" }}>Chyba: {state.error}</p></main>;

  return (
    <main style={box}>
      <h1>revai CRM</h1>
      <p>✅ Přihlášen: <b>{state.me?.email}</b></p>
      <p>Role: <b>{state.me?.roles?.join(", ") || "(žádná)"}</b></p>
      <p style={{ color: "#666" }}>
        Backend běží (klienti, dealy, projekty, tasky, SLA, timeline). Plné obrazovky přidáme v UI fázi.
      </p>
      <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>Odhlásit se</button>
    </main>
  );
}
