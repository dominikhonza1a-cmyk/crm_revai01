import { test } from "@playwright/test";

/**
 * E2E happy path (Playwright): login → přesun dealu na Won → ověř, že vznikl projekt v draftu ze šablony.
 * Ověřuje klíčovou automatizaci W2 end-to-end (viz docs/workflows/catalog.md#w2).
 */
test.describe("Won deal → projekt (draft)", () => {
  test.fixme("přesun dealu na Won vytvoří projekt v draftu se snapshotem fází", async ({ page }) => {
    void page;
    // 1) login, 2) otevři deal, 3) drag na Won + potvrď dialog šablony,
    // 4) přejdi na klienta → tab Projekty → ověř nový projekt status=draft s fázemi Kickoff…Closed
  });
});
