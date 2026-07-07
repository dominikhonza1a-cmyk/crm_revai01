/**
 * Email sync (fáze 3). Ukládá metadata + snippet (NE celé schránky). Párování: from/to ↔ Contact.email,
 * vlákno ↔ otevřený Deal/Project → Activity(type=email) + TimelineEvent(email_received/sent).
 * Nespárované → workspace "inbox" k ručnímu přiřazení (nezahazovat).
 */
export interface EmailSyncService {
  syncSince(connectionId: string, since: Date): Promise<{ imported: number; unmatched: number }>;
}

export const emailSync: EmailSyncService = {
  async syncSince() { throw new Error("emailSync.syncSince: fáze 3."); },
};
