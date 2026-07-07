import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit generuje SQL migrace ze schématu (src/shared/db/schema.ts).
 * Migrace se pouští přes DIRECT_URL (session, 5432) — ne přes transaction pooler.
 * Konvence: workspace_id v každé tabulce; unikátní indexy partial (deleted_at IS NULL).
 */
export default {
  schema: "./src/shared/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL! },
  verbose: true,
  strict: true,
} satisfies Config;
