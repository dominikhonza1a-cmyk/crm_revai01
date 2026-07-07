import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "@/config/app.config";

/**
 * Supabase klienti.
 *  - serverClient: service-role (jen server-side) — správa uživatelů, ověření tokenů. NIKDY do prohlížeče.
 *  - anon key jde do frontendu (login formulář); service-role zůstává na serveru.
 * Používáme Supabase pro AUTENTIZACI (+ později Storage). Data CRM čteme přes Drizzle (shared/db).
 */
let _server: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (_server) return _server;
  const cfg = loadConfig();
  _server = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _server;
}

/** Veřejná konfigurace pro frontend (anon key je bezpečné vystavit). */
export function supabasePublicConfig(): { url: string; anonKey: string } {
  const cfg = loadConfig();
  return { url: cfg.SUPABASE_URL, anonKey: cfg.SUPABASE_ANON_KEY };
}
