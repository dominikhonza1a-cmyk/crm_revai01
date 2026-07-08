import { randomUUID, createHash } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId, currentTenant } from "@/shared/tenant-context";
import { audit } from "@/shared/audit/audit.service";
import { contacts, contactRoles } from "@/modules/contacts/contact.entity";
import { activities, timelineEvents } from "@/modules/activities/activity.entity";
import { taggings } from "@/shared/tags/tag.entity";
import { documents } from "@/modules/documents/document.entity";
import { tasks } from "@/modules/tasks/task.entity";
import { erasureTombstones } from "./gdpr.entity";

/**
 * Právo na výmaz (GDPR čl. 17) — JEDINÉ místo, které řeší polymorfní kaskádu. Viz docs/security/gdpr.md.
 * Default = anonymizace in-place (drží referenční integritu a statistiky). Kroky:
 *  1) Contact → anonymizace polí  2) contact_role → hard delete  3) activity → purge obsahu
 *  4) timeline_event → scrub  5) tagging → hard delete  6) dokumenty s PII → soft delete + úkol
 *  7) audit gdpr_erasure  8) erasure_tombstone (re-apply po restore zálohy)
 */
export const erasure = {
  async eraseContact(contactId: string): Promise<{ anonymized: boolean; documentsToDeleteExternally: string[] }> {
    const ws = currentWorkspaceId();
    const ctx = currentTenant();
    const conn = db();

    const contact = (await conn.select().from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ws))).limit(1))[0];
    if (!contact) return { anonymized: false, documentsToDeleteExternally: [] };

    const emailHash = contact.email ? createHash("sha256").update(contact.email.toLowerCase()).digest("hex") : null;
    const now = new Date();

    // 1) anonymizace kontaktu in-place
    await conn.update(contacts).set({
      firstName: "Anonymized", lastName: "Contact", email: null, phone: null, jobTitle: null,
      linkedinUrl: null, notes: null, preferredChannel: null,
      consentMarketing: false, consentUpdatedAt: null, customFields: {}, anonymizedAt: now, updatedAt: now,
    }).where(eq(contacts.id, contactId));

    // 2) role kontaktu pryč
    await conn.delete(contactRoles).where(and(eq(contactRoles.workspaceId, ws), eq(contactRoles.contactId, contactId)));

    // 3) aktivity: obsah pryč, řádek zůstává jako „interakce proběhla"
    await conn.update(activities).set({ subject: "[odstraněno – GDPR]", body: null, emailMetadata: null, updatedAt: now })
      .where(and(eq(activities.workspaceId, ws),
        or(eq(activities.contactId, contactId), and(eq(activities.entityType, "contact"), eq(activities.entityId, contactId)))));

    // 4) timeline eventy hostované na kontaktu: scrub
    await conn.update(timelineEvents).set({ title: "[odstraněno – GDPR]", payload: null })
      .where(and(eq(timelineEvents.workspaceId, ws), eq(timelineEvents.entityType, "contact"), eq(timelineEvents.entityId, contactId)));

    // 5) tagy kontaktu pryč
    await conn.delete(taggings).where(and(eq(taggings.workspaceId, ws), eq(taggings.entityType, "contact"), eq(taggings.entityId, contactId)));

    // 6) dokumenty s PII vázané na kontakt: reference pryč + úkol na smazání v externím úložišti
    const piiDocs = await conn.select().from(documents)
      .where(and(eq(documents.workspaceId, ws), eq(documents.entityType, "contact"), eq(documents.entityId, contactId), eq(documents.containsPii, true)));
    const externalUrls: string[] = [];
    for (const d of piiDocs) {
      if (d.externalUrl) externalUrls.push(d.externalUrl);
      await conn.update(documents).set({ deletedAt: now }).where(eq(documents.id, d.id));
    }
    if (externalUrls.length) {
      await conn.insert(tasks).values({
        id: randomUUID(), workspaceId: ws, type: "internal",
        title: "GDPR: smazat soubory subjektu v externím úložišti",
        description: `Výmaz kontaktu — smaž ručně tyto soubory (CRM je smazat nemůže):\n${externalUrls.join("\n")}`,
        organizationId: contact.organizationId ?? null, priority: "p2", createdBy: ctx.userId ?? null,
      });
    }

    // 7) audit + 8) tombstone
    await audit.audited(ctx, "gdpr_erasure", { type: "contact", id: contactId },
      { anonymized: { from: false, to: true } });
    await conn.insert(erasureTombstones).values({
      id: randomUUID(), workspaceId: ws, contactId, subjectEmailHash: emailHash, executedBy: ctx.userId ?? null,
    });

    return { anonymized: true, documentsToDeleteExternally: externalUrls };
  },
};
