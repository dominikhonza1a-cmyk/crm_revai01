import type { ImportDefinition, ImportOptions, ImportStats } from "./csv-import.types";

/**
 * Řídí životní cyklus ImportJob: uploaded → mapping → dry_run_done → running → completed|failed.
 * Dry-run zvaliduje VŠECHNY řádky, spočítá stats a chyby (NDJSON), NIC nezapíše.
 * Commit se auditovaně loguje (import_executed). Mapping odmítne secret pole (isSecret).
 */
export interface CsvImportService {
  run<T>(
    def: ImportDefinition<T>,
    rows: Record<string, string>[],
    mapping: Record<string, string>,
    options: ImportOptions,
  ): Promise<{ stats: ImportStats; errorReport: { row: number; error: string }[] }>;
}

export const csvImport: CsvImportService = {
  async run(def, rows, mapping, options) {
    // guard: žádné mapování na secret pole
    for (const target of Object.values(mapping)) {
      if (def.targetFields.find((f) => f.key === target)?.isSecret) {
        throw new Error(`Sloupec nelze mapovat na secret pole '${target}'.`);
      }
    }
    void rows; void options;
    throw new Error("csvImport.run: implementace fáze 2 (dry-run + commit + dedupe).");
  },
};
