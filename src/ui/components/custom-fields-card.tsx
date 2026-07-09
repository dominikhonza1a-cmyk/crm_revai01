"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, formatError } from "./ui";

type EntityType = "organization" | "deal" | "project";

/**
 * Vlastní pole entity — renderuje definice (Nastavení → Vlastní pole) s hodnotami
 * z custom_fields JSONB. Ukládá se na opuštění pole / změnu selectu.
 */
export function CustomFieldsCard({ entityType, entityId, values }: { entityType: EntityType; entityId: string; values: Record<string, unknown> }) {
  const defs = trpc.customFields.definitions.useQuery({ entityType });
  const [local, setLocal] = useState<Record<string, string>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const set = trpc.customFields.setValue.useMutation({
    onSuccess: (_d, vars) => { setSavedKey(vars.key); setTimeout(() => setSavedKey(null), 1500); },
  });

  if (!defs.data?.length) return null;   // žádné definice → karta se neukazuje

  const valueOf = (key: string) => local[key] ?? (values[key] != null ? String(values[key]) : "");
  const save = (key: string) => {
    const v = local[key];
    if (v === undefined || v === String(values[key] ?? "")) return;
    set.mutate({ entityType, entityId, key, value: v === "" ? null : v });
  };
  const input = "w-52 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-accent";

  return (
    <Card>
      <SectionTitle>Vlastní pole</SectionTitle>
      <div className="space-y-2 text-sm">
        {defs.data.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-3">
            <span className="text-muted">{d.label}</span>
            <span className="flex items-center gap-2">
              {savedKey === d.key && <span className="text-xs text-accent">✓</span>}
              {d.fieldType === "select" ? (
                <select className={input} value={valueOf(d.key)}
                  onChange={(e) => { setLocal((l) => ({ ...l, [d.key]: e.target.value })); set.mutate({ entityType, entityId, key: d.key, value: e.target.value || null }); }}>
                  <option value="">—</option>
                  {((d.options as string[]) ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className={input}
                  type={d.fieldType === "number" ? "number" : d.fieldType === "date" ? "date" : "text"}
                  placeholder={d.fieldType === "url" ? "https://…" : "—"}
                  value={valueOf(d.key)}
                  onChange={(e) => setLocal((l) => ({ ...l, [d.key]: e.target.value }))}
                  onBlur={() => save(d.key)} />
              )}
            </span>
          </div>
        ))}
      </div>
      {set.error && <p className="mt-2 text-xs text-red-300">{formatError(set.error.message)}</p>}
    </Card>
  );
}
