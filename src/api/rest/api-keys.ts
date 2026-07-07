/**
 * API klíče pro externí integrační přístup (REST fasáda). Klíč je vázaný na workspace + má permission scope.
 * Hash klíče v DB (nikdy plaintext); prefix pro identifikaci. Vytváří admin v Nastavení → Integrace.
 */
export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  prefix: string;         // zobrazitelná část
  hashedKey: string;      // argon2/bcrypt hash
  scopes: string[];       // např. ["deals:read","tasks:create"]
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export async function verifyApiKey(_rawKey: string): Promise<ApiKey | null> {
  throw new Error("verifyApiKey: implementace fáze 2 (hash lookup + rate limit).");
}
