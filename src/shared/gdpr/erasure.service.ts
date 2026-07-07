import type { ContactId } from "@/domain/ids";

/**
 * Právo na výmaz — JEDINÉ místo, které řeší polymorfní kaskádu. Viz docs/security/gdpr.md.
 * Default = anonymizace in-place (drží referenční integritu). Hard delete jen kontakty bez vazeb.
 * Zapisuje erasure_tombstone (re-apply po restore ze zálohy) a audit_log(gdpr_erasure).
 */
export interface ErasureService {
  eraseContact(contactId: ContactId): Promise<{ anonymized: boolean; documentsToDeleteExternally: string[] }>;
}

export const erasure: ErasureService = {
  async eraseContact(_contactId) {
    // 1) anonymize contact (jméno → "Anonymized Contact", email/phone/linkedin/notes → NULL, PII custom fields → NULL)
    // 2) hard delete contact_role, tagging, reminder
    // 3) purge activity subject/body/email_metadata
    // 4) scrub timeline_event title/payload s PII
    // 5) document contains_pii → delete reference + vygeneruj task "smaž i v Drive/SharePoint"
    // 6) audit_log(gdpr_erasure); zápis erasure_tombstone(subject_email_hash, contact_id, executed_at)
    throw new Error("erasure.eraseContact: implementace fáze 3 (kaskáda dle docs/security/gdpr.md).");
  },
};
