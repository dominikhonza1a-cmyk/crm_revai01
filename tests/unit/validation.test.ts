import { describe, it, expect } from "vitest";
import { urlish } from "@/shared/validation";
import { organizationCreateSchema } from "@/modules/organizations/organization.validation";

describe("urlish (benevolentní URL)", () => {
  it("doplní https:// k www.firma.cz", () => {
    expect(urlish.parse("www.agecentrum.cz")).toBe("https://www.agecentrum.cz");
  });
  it("doplní https:// k holé doméně", () => {
    expect(urlish.parse("agecentrum.cz")).toBe("https://agecentrum.cz");
  });
  it("nechá plnou URL beze změny", () => {
    expect(urlish.parse("https://www.agecentrum.cz/kontakt")).toBe("https://www.agecentrum.cz/kontakt");
  });
  it("odmítne nesmysl", () => {
    expect(() => urlish.parse("ne url vůbec")).toThrow();
  });
});

describe("organizationCreateSchema", () => {
  it("projde s webem bez protokolu (case z produkce: Age Centrum)", () => {
    const out = organizationCreateSchema.parse({ name: "Age Centrum", website: "www.agecentrum.cz", industry: "Psychiatrická léčebna", lifecycleStage: "active_client" });
    expect(out.website).toBe("https://www.agecentrum.cz");
  });
});
