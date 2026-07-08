/**
 * Jednorázové spuštění všech automatizačních jobů (bez workeru) — pro vývoj a ověření.
 * Produkčně je plánuje worker (pg-boss cron). Použití: npx tsx --env-file=.env scripts/run-jobs.ts
 */
import { runAllJobs, runDailyDigest } from "@/workflows/jobs";
import { closeDb } from "@/shared/db";

async function main(): Promise<void> {
  const withDigest = process.argv.includes("--digest");
  await runAllJobs();
  if (withDigest) await runDailyDigest();
  console.log("Joby doběhly.");
  await closeDb();
}
main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
