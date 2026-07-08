import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { contacts } from "@/modules/contacts/contact.entity";

/**
 * Retenční kontrola (GDPR): kandidáti na anonymizaci = kontakty bez aktivity déle než limit
 * (default 18 měsíců, viz config/default.json → retentionDefaults.leadNoConversionMonths).
 * Záměrně NEMAŽE automaticky — admin kandidáty vidí v Nastavení → GDPR a schvaluje ručně
 * (pojistka proti chybné konfiguraci). Viz docs/security/gdpr.md.
 */
export interface RetentionCandidate {
  id: string; firstName: string; lastName: string; email: string | null;
  lastActivityAt: Date | null; createdAt: Date;
}

export async function listRetentionCandidates(months = 18): Promise<RetentionCandidate[]> {
  const ws = currentWorkspaceId();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  return db().select({
    id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email,
    lastActivityAt: contacts.lastActivityAt, createdAt: contacts.createdAt,
  }).from(contacts).where(and(
    eq(contacts.workspaceId, ws),
    isNull(contacts.deletedAt),
    isNull(contacts.anonymizedAt),
    or(
      lt(contacts.lastActivityAt, cutoff),
      and(isNull(contacts.lastActivityAt), lt(contacts.createdAt, cutoff)),
    ),
  )).orderBy(sql`coalesce(${contacts.lastActivityAt}, ${contacts.createdAt})`);
}
