import { describe, it, expect } from "vitest";
import { relevantCounterparts, findOrgs } from "@/modules/integrations/google/google-sync.job";

const OWN = "automatizace-ai.cz";

describe("Google sync — párování e-mailů na klienty", () => {
  const maps = {
    byEmail: new Map([["jan.novak@acme.cz", "org-acme"]]),
    byDomain: new Map([["acme.cz", "org-acme"], ["betamfg.cz", "org-beta"]]),
  };

  it("newsletter a automatické adresy se nepárují", () => {
    const out = relevantCounterparts(
      ["newsletter@acme.cz", "noreply@acme.cz", "no-reply@shop.cz", "notifications@github.com", "jan.novak@acme.cz"],
      OWN,
    );
    expect(out).toEqual(["jan.novak@acme.cz"]);
  });

  it("vlastní doména (interní pošta) se nepáruje", () => {
    const out = relevantCounterparts(["d.valter@automatizace-ai.cz", "j.rehberger@automatizace-ai.cz"], OWN);
    expect(out).toEqual([]);
  });

  it("e-mail kontaktu i doména webu vedou ke klientovi", () => {
    expect(findOrgs(["jan.novak@acme.cz"], maps)).toEqual(["org-acme"]);
    expect(findOrgs(["kdokoliv@acme.cz"], maps)).toEqual(["org-acme"]);   // dle domény webu
  });

  it("více lidí z více firem v jednom vlákně → event u KAŽDÉHO klienta (bez duplicit)", () => {
    const orgs = findOrgs(["jan.novak@acme.cz", "petra@acme.cz", "šéf@betamfg.cz".normalize(), "cizi@neznama-firma.cz"], maps);
    expect(orgs.sort()).toEqual(["org-acme", "org-beta"]);
  });

  it("neznámá firma (žádný kontakt, žádná doména) se ignoruje", () => {
    expect(findOrgs(["nekdo@random.io"], maps)).toEqual([]);
  });
});
