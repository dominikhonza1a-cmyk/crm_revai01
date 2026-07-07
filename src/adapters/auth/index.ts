import { loadConfig } from "@/config/app.config";
import { supabaseAuth } from "./supabase.adapter";
import type { AuthProvider } from "./auth.port";

/** Factory dle AUTH_PROVIDER. better_auth adapter je alternativa (přenositelnost) — doplní se, pokud bude potřeba. */
export function resolveAuthProvider(): AuthProvider {
  const { AUTH_PROVIDER } = loadConfig();
  switch (AUTH_PROVIDER) {
    case "supabase": return supabaseAuth;
    // case "better_auth": return betterAuth;
    default: return supabaseAuth;
  }
}

export type { AuthProvider, AuthenticatedIdentity } from "./auth.port";
