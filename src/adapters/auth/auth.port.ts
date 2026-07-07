/**
 * Port pro autentizaci. Odděluje appku od konkrétního providera (Supabase Auth teď, Better Auth jako alternativa).
 * Řeší JEN „kdo jsi" (identita). „Co smíš" (RBAC) je v naší app (domain/policies/permission.policy).
 */
export interface AuthenticatedIdentity {
  authUserId: string;      // Supabase auth.users.id
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;     // má aktivní TOTP faktor
}

export interface AuthProvider {
  /** Ověří access token (JWT z cookie/hlavičky) → identita, nebo null když neplatný. */
  verifyToken(accessToken: string): Promise<AuthenticatedIdentity | null>;
  /** Pozve uživatele (vytvoří účet v provideru, pošle magic link / setup). */
  inviteUser(email: string): Promise<{ authUserId: string }>;
  /** Deaktivace/odhlášení (revokace session). */
  disableUser(authUserId: string): Promise<void>;
}
