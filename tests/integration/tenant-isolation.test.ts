import { describe, it } from "vitest";

/**
 * Integrační test izolace workspace (testcontainers Postgres). Ověřuje, že dotaz z workspace A
 * NIKDY nevrátí data workspace B — páteř multi-tenancy. Kritický i pro budoucí SaaS.
 */
describe("tenant isolation", () => {
  it.todo("dotaz repository ve workspace A nevrátí řádky workspace B");
  it.todo("RLS policy (multi mode) zablokuje cross-tenant čtení i při chybě aplikace");
});
