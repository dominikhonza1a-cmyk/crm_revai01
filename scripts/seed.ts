/** Naseeduje role, pipeline stages, SLA tiery, tagy a projektové šablony. `npm run db:seed`. */
import { runSeeds } from "../db/seeds";

async function main(): Promise<void> {
  const withDemo = process.argv.includes("--demo");
  await runSeeds({ withDemo });
  console.log("Seed hotov.");
}
main().catch((e) => { console.error(e); process.exit(1); });
