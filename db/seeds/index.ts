import { seedTenant } from "./00-tenant.seed";
import { seedRoles } from "./01-roles.seed";
import { seedPipelineStages } from "./03-pipeline-stages.seed";
import { seedTags } from "./06-tags.seed";
import { seedProjectTemplates } from "./08-project-templates.seed";

/**
 * Orchestrátor seedů (scripts/seed.ts). Pořadí respektuje FK závislosti. Vše idempotentní.
 * Fáze 0–1: tenant, role, pipeline stages, tagy. Fáze 1 pokr.: project phases, SLA tiery, šablony.
 */
export async function runSeeds(opts: { withDemo?: boolean } = {}): Promise<void> {
  const { workspaceId } = await seedTenant();   // 00 — workspace + owner účty
  await seedRoles(workspaceId);                  // 01 + 02 — role z permissions.json, admin ownerům
  await seedPipelineStages(workspaceId);         // 03 — sales pipeline
  await seedTags(workspaceId);                    // 06 — výchozí tagy
  await seedProjectTemplates(workspaceId);        // 08 — projektové šablony (chatbot/automation/custom-ai/retainer)

  // Fáze 1 pokr. (po vzniku dalších tabulek):
  // await seedSlaTiers(workspaceId);            // 05
  if (opts.withDemo) { /* 99 demo data */ }

  console.log(`Seed OK — workspace ${workspaceId}`);
}
