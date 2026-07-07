/**
 * Storage porty. Dokumenty jsou primárně REFERENCE (LinkResolverPort); nativní upload (StoragePort) je opt-in.
 * Viz docs/integrations/storage-links.md.
 */
export interface StoragePort {
  put(key: string, data: Uint8Array, mime: string): Promise<{ storageKey: string; checksum: string; size: number }>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export interface LinkMetadata {
  title: string;
  mime: string | null;
  versionLabel: string | null;
  modifiedAt: string | null;
  modifiedBy: string | null;
}

/** Načte metadata externího odkazu (Drive/SharePoint) — verzování řeší externí systém. */
export interface LinkResolverPort {
  resolve(externalUrl: string): Promise<LinkMetadata>;
}
