import { readFileSync, writeFileSync } from "node:fs";

/**
 * Pomocník: složí DATABASE_URL (6543) a DIRECT_URL (5432) ze správného pooler host/uživatele (z DIRECT_URL)
 * a hesla z dočasné proměnné SUPABASE_DB_PASSWORD. Heslo percent-enkóduje (bezpečné i se speciálními znaky)
 * a dočasnou proměnnou z .env smaže. NIKDY nevypisuje heslo.
 * Spuštění: npx tsx --env-file=.env scripts/fix-db-urls.ts
 */
const ENV_PATH = ".env";
const pw = process.env.SUPABASE_DB_PASSWORD;
if (!pw) throw new Error("Chybí SUPABASE_DB_PASSWORD v .env — přidej řádek s novým heslem a spusť znovu.");

const src = new URL(process.env.DIRECT_URL!);   // bereme jen správný host + user (heslo ignorujeme)
const user = src.username;                        // postgres.<ref>
const host = src.hostname;                        // aws-0-<region>.pooler.supabase.com
const enc = encodeURIComponent(pw);

const directUrl = `postgresql://${user}:${enc}@${host}:5432/postgres`;
const poolUrl = `postgresql://${user}:${enc}@${host}:6543/postgres`;

let text = readFileSync(ENV_PATH, "utf8");
text = text.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${poolUrl}`);
text = text.replace(/^DIRECT_URL=.*$/m, `DIRECT_URL=${directUrl}`);
text = text.replace(/^SUPABASE_DB_PASSWORD=.*\r?\n?/m, "");
writeFileSync(ENV_PATH, text);

console.log(`OK: DATABASE_URL (6543) a DIRECT_URL (5432) přepsány pro ${user}@${host}. SUPABASE_DB_PASSWORD odstraněn.`);
