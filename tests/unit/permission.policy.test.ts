import { describe, it, expect } from "vitest";
import { mergeRoles, can, canExport } from "@/domain/policies/permission.policy";

describe("permission.policy", () => {
  it("efektivní právo = maximum přes role", () => {
    const perm = mergeRoles([
      { key: "support", modules: { deals: "none" } as never, fieldPolicies: {}, exports: [] },
      { key: "sales", modules: { deals: "write" } as never, fieldPolicies: {}, exports: ["export.deals"] },
    ]);
    expect(can(perm, "deals", "write")).toBe(true);
    expect(canExport(perm, "export.deals")).toBe(true);
  });

  it("dev nevidí finance (hidden) — nejvyšší přístup vyhrává jen pokud jinou rolí přiznán", () => {
    const perm = mergeRoles([
      { key: "dev", modules: {} as never, fieldPolicies: { "deal.financials": "hidden" }, exports: [] },
    ]);
    expect(perm.fieldPolicies["deal.financials"]).toBe("hidden");
  });
});
