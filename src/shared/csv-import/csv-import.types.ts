/**
 * Obecný CSV import framework. Konkrétní entity (organizations, contacts, deals) dodají ImportDefinition.
 * Viz docs/migration/import-strategy.md.
 */
export type DuplicateStrategy = "skip" | "update" | "create";

export interface ImportDefinition<T> {
  type: "organizations" | "contacts" | "deals";
  /** Cílová pole a jak se mapují z CSV sloupců (uživatel mapuje v UI). */
  targetFields: { key: string; label: string; required: boolean; isPii?: boolean; isSecret?: boolean }[];
  /** Klíč pro deduplikaci (email; name+domain). */
  dedupeKey(row: T): string | null;
  /** Parsuje a validuje jeden řádek (sdílí zod schéma s API). Vrací chybu → řádek jde do error reportu. */
  parseRow(raw: Record<string, string>, mapping: Record<string, string>): { ok: true; value: T } | { ok: false; error: string };
}

export interface ImportStats {
  rowsTotal: number; created: number; updated: number; skipped: number; errors: number;
}

export interface ImportOptions {
  dryRun: boolean;
  duplicateStrategy: DuplicateStrategy;
}
