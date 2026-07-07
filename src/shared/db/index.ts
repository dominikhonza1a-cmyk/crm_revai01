import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadConfig } from "@/config/app.config";
import * as schema from "./schema";

/**
 * Drizzle klient nad Supabase PostgreSQL.
 *  - App (web): DATABASE_URL = transaction pooler (6543). `prepare: false` je NUTNÉ (pooler nepodporuje prepared statements).
 *  - Migrace/worker: DIRECT_URL = session (5432) — viz scripts/migrate.ts a worker.
 * Business logika běží v naší app, ne v Supabase RLS/edge. Tenant scoping řeší TenantScopedRepository.
 */
let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (_db) return _db;
  const cfg = loadConfig();
  _sql = postgres(cfg.DATABASE_URL, { prepare: false });
  _db = drizzle(_sql, { schema });
  return _db;
}

export type Db = ReturnType<typeof db>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Transakce + transactional outbox: doménová změna a zápis eventu do outboxu ve STEJNÉ transakci.
 * (event-bus.publish zapisuje přes předané `tx`.)
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().transaction(fn);
}

/** Uzavře DB spojení — volat na konci CLI skriptů (seed, migrace), jinak proces „visí" na otevřeném poolu. */
export async function closeDb(): Promise<void> {
  if (_sql) { await _sql.end({ timeout: 5 }); _sql = null; _db = null; }
}

export { schema };
