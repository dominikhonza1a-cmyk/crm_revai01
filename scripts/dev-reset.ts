/** DEV ONLY: dropne schéma, znovu migruje a naseeduje (+ demo data). Nikdy nespouštět v produkci. */
export {}; // označí soubor jako modul (vlastní scope)

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("dev-reset je zakázán v produkci.");
  throw new Error("dev-reset: drop + migrate + seed --demo (fáze 0).");
}
main().catch((e) => { console.error(e); process.exit(1); });
