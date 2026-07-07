import { describe, it, expect } from "vitest";
import { validateValues, piiKeys, type CustomFieldDefinition } from "@/shared/custom-fields/custom-fields.service";

const defs: CustomFieldDefinition[] = [
  { entityType: "organization", key: "annual_revenue", label: "Obrat", fieldType: "number", options: null, required: false, isPii: false, archivedAt: null },
  { entityType: "organization", key: "tech_stack", label: "Tech", fieldType: "multiselect", options: ["n8n", "openai"], required: false, isPii: false, archivedAt: null },
  { entityType: "organization", key: "contact_note", label: "Pozn.", fieldType: "text", options: null, required: false, isPii: true, archivedAt: null },
];

describe("custom-fields", () => {
  it("zvaliduje správné hodnoty", () => {
    const out = validateValues(defs, { annual_revenue: 5000000, tech_stack: ["n8n"] });
    expect(out.annual_revenue).toBe(5000000);
  });

  it("odmítne špatný typ", () => {
    expect(() => validateValues(defs, { annual_revenue: "hodně" })).toThrow();
  });

  it("odmítne hodnotu mimo select", () => {
    expect(() => validateValues(defs, { tech_stack: ["neznámé"] })).toThrow();
  });

  it("piiKeys vrátí PII pole", () => {
    expect(piiKeys(defs)).toEqual(["contact_note"]);
  });
});
