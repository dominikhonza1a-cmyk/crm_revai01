import type { ContactId } from "@/domain/ids";

/**
 * Export subjektu údajů (GDPR). JSON bundle: contact + custom fields, contact_roles, activities
 * (metadata + těla), účast na dealech/projektech, consent historie, tagy. Auditováno gdpr_export.
 */
export interface DataSubjectExport {
  exportContact(contactId: ContactId): Promise<{ bundle: Record<string, unknown> }>;
}

export const dataExport: DataSubjectExport = {
  async exportContact(_contactId) {
    throw new Error("dataExport.exportContact: implementace fáze 3.");
  },
};
