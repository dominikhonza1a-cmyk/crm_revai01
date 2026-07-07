/** Naseeduje role, pipeline stages, SLA tiery, tagy a projektové šablony. `npm run db:seed`. */
import { runSeeds } from "../db/seeds";
import { closeDb } from "@/shared/db";

async function main(): Promise<void> {
  const withDemo = process.argv.includes("--demo");
  await runSeeds({ withDemo });
  console.log("Seed hotov.");
  await closeDb();
}
main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
