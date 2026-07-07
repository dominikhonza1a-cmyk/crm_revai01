import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { workspaces, appUsers } from "@/modules/security/security.entity";
import { loadConfig, ownerEmails } from "@/config/app.config";

/**
 * Výchozí workspace + owner účty (SEED_OWNER_EMAILS). Idempotentní (dle slug/email).
 * Owner účty dostanou roli admin v 01-roles seedu. Přihlášení proběhne přes Supabase — při prvním loginu
 * se app_user napojí na auth.users dle emailu (viz api/context.ts). Uživatele pozveš v Supabase Auth
 * (nebo přes AuthProvider.inviteUser) na stejné emaily.
 */
export async function seedTenant(): Promise<{ workspaceId: string }> {
  const cfg = loadConfig();
  const conn = db();
  const slug = cfg.SEED_WORKSPACE_NAME.toLowerCase().replace(/\s+/g, "-");

  let ws = (await conn.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1))[0];
  if (!ws) {
    const id = randomUUID();
    await conn.insert(workspaces).values({
      id, name: cfg.SEED_WORKSPACE_NAME, slug,
      defaultTimezone: cfg.DEFAULT_TIMEZONE, defaultCurrency: cfg.DEFAULT_CURRENCY,
    });
    ws = (await conn.select().from(workspaces).where(eq(workspaces.id, id)).limit(1))[0]!;
  }

  for (const email of ownerEmails()) {
    const exists = (await conn.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, email)).limit(1))[0];
    if (!exists) {
      await conn.insert(appUsers).values({
        id: randomUUID(), workspaceId: ws.id, email,
        fullName: email.split("@")[0]!, status: "invited",
        timezone: cfg.DEFAULT_TIMEZONE, locale: "cs",
      });
    }
  }
  return { workspaceId: ws.id };
}
