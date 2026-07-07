import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "@/config/app.config";

/**
 * Supabase klienti.
 *  - serverClient: secret key (jen server-side) — správa uživatelů, ověření tokenů. NIKDY do prohlížeče.
 *  - publishable key jde do frontendu (login formulář); secret key zůstává na serveru.
 * Používáme Supabase pro AUTENTIZACI (+ později Storage). Data CRM čteme přes Drizzle (shared/db).
 */
let _server: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (_server) return _server;
  const cfg = loadConfig();
  _server = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _server;
}

/** Veřejná konfigurace pro frontend (publishable key je bezpečné vystavit). */
export function supabasePublicConfig(): { url: string; publishableKey: string } {
  const cfg = loadConfig();
  return { url: cfg.SUPABASE_URL, publishableKey: cfg.SUPABASE_PUBLISHABLE_KEY };
}
