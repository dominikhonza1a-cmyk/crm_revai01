/**
 * Export dat subjektu (kontaktu) do JSON bundle. Auditováno gdpr_export.
 * Použití: tsx scripts/gdpr-export.ts <contactId>. Viz docs/security/gdpr.md.
 */
import { dataExport } from "@/shared/gdpr/export.service";
import { asId } from "@/domain/ids";

async function main(): Promise<void> {
  const [contactId] = process.argv.slice(2);
  if (!contactId) throw new Error("Použití: gdpr-export <contactId>");
  const { bundle } = await dataExport.exportContact(asId(contactId));
  console.log(JSON.stringify(bundle, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
