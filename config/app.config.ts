import { z } from "zod";

/**
 * Typovaný loader env proměnných. Validuje se JEDNOU při startu procesu (fail-fast).
 * Nikde jinde v kódu se nesahá přímo na process.env.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  DEFAULT_TIMEZONE: z.string().default("Europe/Prague"),
  DEFAULT_CURRENCY: z.string().length(3).default("CZK"),

  // Supabase (DB + Auth) — nový formát klíčů (Publishable / Secret)
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),   // klient (dřív "anon public")
  SUPABASE_SECRET_KEY: z.string().min(20),        // jen server (dřív "service_role")
  DATABASE_URL: z.string().url(),          // pooled (6543) — web app
  DIRECT_URL: z.string().url(),            // direct (5432) — migrace + worker

  AUTH_PROVIDER: z.enum(["supabase", "better_auth"]).default("supabase"),

  TENANCY_MODE: z.enum(["single", "multi"]).default("single"),
  SEED_WORKSPACE_NAME: z.string().default("revai"),
  SEED_OWNER_EMAILS: z.string().default(""),

  SECRETS_BACKEND: z.enum(["env", "vault", "1password"]).default("env"),
  EMAIL_PROVIDER: z.enum(["console", "smtp", "gmail", "outlook"]).default("console"),
  SMTP_URL: z.string().optional(),
  SMTP_FROM: z.string().optional(),          // např. "revai CRM <info@automatizace-ai.cz>"
  CRON_SECRET: z.string().optional(),        // ochrana /api/jobs (Netlify cron funkce)
  GITHUB_WEBHOOK_SECRET: z.string().optional(),  // ověření podpisu GitHub webhooků (git → timeline)
  GOOGLE_CLIENT_ID: z.string().optional(),       // OAuth client pro Gmail/Calendar sync (fáze 3)
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),   // AES-GCM šifrování OAuth tokenů v DB
  CHAT_PROVIDER: z.enum(["console", "webhook"]).default("console"),
  CHAT_WEBHOOK_URL: z.string().url().optional(),
  STORAGE_PROVIDER: z.enum(["link", "supabase", "s3"]).default("link"),
  STORAGE_BUCKET: z.string().default("documents"),
  DIGEST_DEFAULT_HOUR: z.coerce.number().int().min(0).max(23).default(7),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Neplatná konfigurace prostředí:\n" + parsed.error.toString());
  }
  cached = parsed.data;
  return cached;
}

export const ownerEmails = (): string[] =>
  loadConfig().SEED_OWNER_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
