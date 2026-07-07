import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

/**
 * Spustí .sql migrace z db/migrations v abecedním pořadí přes DIRECT_URL (session, 5432).
 * Idempotentní tracking v tabulce _migrations. `npm run db:migrate`.
 * (Alternativa: `npm run db:generate` + Drizzle migrator — zde jednoduchý runner bez extra závislostí.)
 */
const DIR = join(process.cwd(), "db", "migrations");

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Chybí DIRECT_URL / DATABASE_URL.");
  const sql = postgres(url, { max: 1 });

  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from _migrations`).map((r) => r.name as string));

  const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) { console.log(`↷ přeskočeno ${file}`); continue; }
    const ddl = await readFile(join(DIR, file), "utf8");
    console.log(`→ aplikuji ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`insert into _migrations (name) values (${file})`;
    });
  }
  await sql.end();
  console.log("Migrace hotové.");
}
main().catch((e) => { console.error(e); process.exit(1); });
