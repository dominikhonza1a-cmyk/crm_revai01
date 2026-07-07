import type { TenantContext } from "@/shared";
import { audit } from "@/shared";
import { activityService } from "@/modules/activities/activity.service";
import { documentRepository } from "./document.repository";
import type { DocumentCreateInput } from "./document.types";
import type { DocumentRow } from "./document.entity";

/**
 * Use-casy modulu documents. Primárně reference (external_ref); nativní upload opt-in (fáze 2).
 * Secret ref: audit document_secret_ref_changed. Verzování dle kind (viz docs/integrations/storage-links.md).
 */
const TIMELINE_HOSTS = ["organization", "deal", "project", "task"] as const;

export const documentService = {
  async link(ctx: TenantContext, input: DocumentCreateInput): Promise<{ documentId: string }> {
    const doc = await documentRepository.create({
      kind: input.kind, title: input.title, entityType: input.entityType, entityId: input.entityId,
      docCategory: input.docCategory, storageProvider: input.storageProvider, externalUrl: input.externalUrl,
      mimeType: undefined, containsPii: input.containsPii, secretLocation: input.secretLocation, secretPolicyNote: input.secretPolicyNote,
      createdBy: ctx.userId,
    });

    // reference: založ verzi 1 s metadaty (externí systém verzuje dál)
    if (input.kind === "external_ref") {
      await documentRepository.addVersion(doc.id, { externalVersionLabel: "v1", externalModifiedAt: new Date(), uploadedBy: ctx.userId });
    }
    if (input.kind === "secret_ref") {
      await audit.audited(ctx, "document_secret_ref_changed", { type: "document", id: doc.id }, { secret_location: { from: null, to: input.secretLocation ?? null } });
    }

    // timeline (jen na host entitách podporovaných timeline; contact vynecháme kvůli GDPR minimalizaci)
    if ((TIMELINE_HOSTS as readonly string[]).includes(input.entityType)) {
      await activityService.writeTimeline(ctx, {
        entityType: input.entityType as (typeof TIMELINE_HOSTS)[number], entityId: input.entityId,
        eventType: "document_linked", title: `Dokument: ${input.title}`, sourceType: "document", sourceId: doc.id,
      });
    }
    return { documentId: doc.id };
  },

  async list(_ctx: TenantContext, entityType: string, entityId: string): Promise<DocumentRow[]> {
    return documentRepository.list(entityType, entityId);
  },

  async versions(_ctx: TenantContext, documentId: string) {
    return documentRepository.listVersions(documentId);
  },

  /** Nová verze u reference (metadata z externího úložiště). Nativní upload = fáze 2. */
  async addExternalVersion(_ctx: TenantContext, documentId: string, label: string, modifiedBy?: string): Promise<void> {
    await documentRepository.addVersion(documentId, { externalVersionLabel: label, externalModifiedAt: new Date(), externalModifiedBy: modifiedBy });
  },

  async archive(ctx: TenantContext, id: string): Promise<void> {
    await documentRepository.softDelete(id);
    await audit.audited(ctx, "record_deleted", { type: "document", id });
  },
};
