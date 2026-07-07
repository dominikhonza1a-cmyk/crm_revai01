import { supabaseServer } from "@/shared/supabase";
import type { AuthProvider, AuthenticatedIdentity } from "./auth.port";

/**
 * Supabase Auth adapter. Email+heslo a TOTP MFA konfiguruje Supabase (Auth → Providers/MFA).
 * Google OAuth se přidá později bez zásahu do tohoto kódu (jen zapnout providera v Supabase).
 */
export const supabaseAuth: AuthProvider = {
  async verifyToken(accessToken) {
    const { data, error } = await supabaseServer().auth.getUser(accessToken);
    if (error || !data.user) return null;
    const u = data.user;
    const identity: AuthenticatedIdentity = {
      authUserId: u.id,
      email: u.email ?? "",
      emailVerified: Boolean(u.email_confirmed_at),
      // aal2 = ověřený druhý faktor v aktuální session; existence faktoru = MFA nastaveno
      mfaEnabled: (u.factors?.length ?? 0) > 0,
    };
    return identity;
  },

  async inviteUser(email) {
    const { data, error } = await supabaseServer().auth.admin.inviteUserByEmail(email);
    if (error || !data.user) throw new Error(`Supabase inviteUser selhalo: ${error?.message}`);
    return { authUserId: data.user.id };
  },

  async disableUser(authUserId) {
    // ban_duration "none" → trvalá deaktivace; session revokace přes signOut(scope: global)
    const { error } = await supabaseServer().auth.admin.updateUserById(authUserId, { ban_duration: "876000h" });
    if (error) throw new Error(`Supabase disableUser selhalo: ${error.message}`);
  },
};
