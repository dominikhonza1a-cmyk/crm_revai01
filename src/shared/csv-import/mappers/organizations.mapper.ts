import type { ImportDefinition } from "../csv-import.types";

/** Import definice pro Organizations. Dedupe: name + doména z website. Detail: docs/migration/csv-mapping.md. */
export const organizationsImport: ImportDefinition<{ name: string; website?: string; industry?: string }> = {
  type: "organizations",
  targetFields: [
    { key: "name", label: "Název", required: true },
    { key: "website", label: "Web", required: false },
    { key: "industry", label: "Odvětví", required: false },
    { key: "employee_count_band", label: "Velikost", required: false },
    { key: "lifecycle_stage", label: "Fáze vztahu", required: false },
    { key: "owner_email", label: "Vlastník (email)", required: false },
  ],
  dedupeKey: (row) => row.website ? domain(row.website) : row.name.trim().toLowerCase(),
  parseRow: (_raw, _mapping) => { throw new Error("organizations parseRow: fáze 2 (sdílet validaci s API)."); },
};

const domain = (url: string): string => url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]!.toLowerCase();
