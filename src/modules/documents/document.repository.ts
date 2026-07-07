import { randomUUID } from "node:crypto";
import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { documents, documentVersions, type DocumentRow, type DocumentVersionRow } from "./document.entity";

export interface DocumentInsertData {
  kind: string; title: string; entityType: string; entityId: string; docCategory: string;
  storageProvider?: string | null; externalUrl?: string | null; externalFileId?: string | null;
  mimeType?: string | null; containsPii?: boolean; secretLocation?: string | null; secretPolicyNote?: string | null;
  createdBy?: string | null;
}

export const documentRepository = {
  async getById(id: string): Promise<DocumentRow | null> {
    const ws = currentWorkspaceId();
    return (await db().select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.workspaceId, ws), isNull(documents.deletedAt))).limit(1))[0] ?? null;
  },

  async list(entityType: string, entityId: string): Promise<DocumentRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(documents)
      .where(and(eq(documents.workspaceId, ws), eq(documents.entityType, entityType), eq(documents.entityId, entityId), isNull(documents.deletedAt)))
      .orderBy(desc(documents.createdAt));
  },

  async create(data: DocumentInsertData): Promise<DocumentRow> {
    const ws = currentWorkspaceId();
    const id = randomUUID();
    await db().insert(documents).values({
      id, workspaceId: ws, kind: data.kind, title: data.title, entityType: data.entityType, entityId: data.entityId,
      docCategory: data.docCategory, storageProvider: data.storageProvider ?? null, externalUrl: data.externalUrl ?? null,
      externalFileId: data.externalFileId ?? null, mimeType: data.mimeType ?? null, containsPii: data.containsPii ?? false,
      secretLocation: data.secretLocation ?? null, secretPolicyNote: data.secretPolicyNote ?? null, createdBy: data.createdBy ?? null,
    });
    return (await this.getById(id))!;
  },

  async addVersion(documentId: string, data: { storageKey?: string | null; sizeBytes?: bigint | null; checksum?: string | null; externalVersionLabel?: string | null; externalModifiedAt?: Date | null; externalModifiedBy?: string | null; uploadedBy?: string | null }): Promise<DocumentVersionRow> {
    const ws = currentWorkspaceId();
    const maxRow = (await db().select({ max: sql<number>`coalesce(max(${documentVersions.versionNumber}), 0)::int` })
      .from(documentVersions).where(eq(documentVersions.documentId, documentId)))[0];
    const versionNumber = (maxRow?.max ?? 0) + 1;
    const id = randomUUID();
    await db().insert(documentVersions).values({
      id, workspaceId: ws, documentId, versionNumber, storageKey: data.storageKey ?? null, sizeBytes: data.sizeBytes ?? null,
      checksum: data.checksum ?? null, externalVersionLabel: data.externalVersionLabel ?? null,
      externalModifiedAt: data.externalModifiedAt ?? null, externalModifiedBy: data.externalModifiedBy ?? null, uploadedBy: data.uploadedBy ?? null,
    });
    await db().update(documents).set({ currentVersionId: id, updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), eq(documents.workspaceId, ws)));
    return (await db().select().from(documentVersions).where(eq(documentVersions.id, id)).limit(1))[0]!;
  },

  async listVersions(documentId: string): Promise<DocumentVersionRow[]> {
    const ws = currentWorkspaceId();
    return db().select().from(documentVersions)
      .where(and(eq(documentVersions.workspaceId, ws), eq(documentVersions.documentId, documentId)))
      .orderBy(desc(documentVersions.versionNumber));
  },

  async softDelete(id: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(documents).set({ deletedAt: new Date() }).where(and(eq(documents.id, id), eq(documents.workspaceId, ws)));
  },
};
