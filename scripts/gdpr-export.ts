/**
 * Export dat subjektu (kontaktu) do JSON. Auditováno gdpr_export.
 * Použití: npx tsx --env-file=.env scripts/gdpr-export.ts <contactId>
 */
import { eq } from "drizzle-orm";
import { runWithTenant } from "@/shared";
import { db, closeDb } from "@/shared/db";
import { workspaces } from "@/modules/security/security.entity";
import { dataExport } from "@/shared/gdpr/export.service";
import { asId, type WorkspaceId } from "@/domain/ids";

async function main(): Promise<void> {
  const [contactId] = process.argv.slice(2);
  if (!contactId) throw new Error("Použití: gdpr-export <contactId>");
  const ws = (await db().select().from(workspaces).limit(1))[0];
  if (!ws) throw new Error("Žádný workspace.");
  const { bundle } = await runWithTenant(
    { workspaceId: asId<WorkspaceId>(ws.id), userId: null, requestId: "cli:gdpr-export" },
    () => dataExport.exportContact(contactId),
  );
  console.log(JSON.stringify(bundle, null, 2));
  await closeDb();
  void eq;
}
main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
