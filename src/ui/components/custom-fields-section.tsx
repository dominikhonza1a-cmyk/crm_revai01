"use client";

import { useState } from "react";
import { trpc } from "@/ui/trpc";
import { Card, SectionTitle, Badge, Modal, fieldInput, fieldLabel, btnPrimary, btnGhost, formatError } from "./ui";

const ENTITY_LABEL: Record<string, string> = { organization: "Klient", deal: "Deal", project: "Projekt" };
const TYPE_LABEL: Record<string, string> = { text: "Text", number: "Číslo", date: "Datum", select: "Výběr", url: "Odkaz" };

/** Správa vlastních polí (Nastavení, admin). Hodnoty se pak vyplňují na kartách entit. */
export function CustomFieldsSection() {
  const utils = trpc.useUtils();
  const defs = trpc.customFields.allDefinitions.useQuery();
  const [modal, setModal] = useState(false);
  const [entityType, setEntityType] = useState<"organization" | "deal" | "project">("organization");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "number" | "date" | "select" | "url">("text");
  const [options, setOptions] = useState("");

  const refresh = () => Promise.all([utils.customFields.allDefinitions.invalidate(), utils.customFields.definitions.invalidate()]);
  const create = trpc.customFields.createDefinition.useMutation({
    onSuccess: async () => { setModal(false); setLabel(""); setOptions(""); await refresh(); },
  });
  const archive = trpc.customFields.archiveDefinition.useMutation({ onSuccess: refresh });

  return (
    <Card>
      <SectionTitle right={
        <button className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
          onClick={() => setModal(true)}>+ Nové pole</button>
      }>Vlastní pole</SectionTitle>
      <p className="mb-3 text-sm text-muted">Vlastní atributy klientů, dealů a projektů (např. „IČO", „Segment"). Vyplňují se pak na kartě entity v sekci „Vlastní pole".</p>

      {defs.isLoading ? <p className="text-sm text-faint">Načítám…</p>
        : !defs.data?.length ? <p className="text-sm text-faint">Zatím žádná pole.</p>
        : (
          <ul className="divide-y divide-line">
            {defs.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <div className="text-sm">
                  <span className="text-ink">{d.label}</span>
                  <Badge tone="blue">{ENTITY_LABEL[d.entityType] ?? d.entityType}</Badge>
                  <Badge tone="slate">{TYPE_LABEL[d.fieldType] ?? d.fieldType}</Badge>
                </div>
                <button className="text-xs text-red-300 hover:underline" disabled={archive.isPending}
                  onClick={() => archive.mutate({ id: d.id })}>Odebrat</button>
              </li>
            ))}
          </ul>
        )}

      {modal && (
        <Modal title="Nové vlastní pole" onClose={() => setModal(false)}>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ entityType, label, fieldType, options: fieldType === "select" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined });
          }}>
            <div><label className={fieldLabel}>Kde *</label>
              <select className={fieldInput} value={entityType} onChange={(e) => setEntityType(e.target.value as never)}>
                <option value="organization">Klient</option><option value="deal">Deal</option><option value="project">Projekt</option>
              </select>
            </div>
            <div><label className={fieldLabel}>Název pole *</label>
              <input className={fieldInput} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="např. IČO" required autoFocus /></div>
            <div><label className={fieldLabel}>Typ</label>
              <select className={fieldInput} value={fieldType} onChange={(e) => setFieldType(e.target.value as never)}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {fieldType === "select" && (
              <div><label className={fieldLabel}>Možnosti (oddělené čárkou) *</label>
                <input className={fieldInput} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Malý, Střední, Velký" required /></div>
            )}
            {create.error && <p className="text-sm text-red-300">{formatError(create.error.message)}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setModal(false)}>Zrušit</button>
              <button type="submit" className={btnPrimary} disabled={create.isPending}>{create.isPending ? "Vytvářím…" : "Vytvořit"}</button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
