import type { TenantScopedRepository } from "@/shared/repository-base";
import type { DocumentCreateInput, DocumentUpdateInput, DocumentListFilter } from "./document.types";

export interface DocumentRepository extends TenantScopedRepository<unknown, DocumentCreateInput, DocumentUpdateInput, DocumentListFilter> {
  addVersion(documentId: string, version: { versionNumber: number; storageKey?: string; externalVersionLabel?: string }): Promise<void>;
  listPiiForContact(contactId: string): Promise<{ id: string; externalUrl: string | null }[]>;   // GDPR erasure
}

export const documentRepository: DocumentRepository = {
  async findById() { throw new Error("documentRepository.findById: fáze 1."); },
  async list() { throw new Error("documentRepository.list: fáze 1."); },
  async create() { throw new Error("documentRepository.create: fáze 1."); },
  async update() { throw new Error("documentRepository.update: fáze 1."); },
  async softDelete() { throw new Error("documentRepository.softDelete: fáze 1."); },
  async restore() { throw new Error("documentRepository.restore: fáze 1."); },
  async addVersion() { throw new Error("documentRepository.addVersion: fáze 2."); },
  async listPiiForContact() { throw new Error("documentRepository.listPiiForContact: fáze 3 (GDPR)."); },
};
