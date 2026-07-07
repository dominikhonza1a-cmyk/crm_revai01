import { loadConfig } from "@/config/app.config";
import type { StoragePort, LinkResolverPort } from "./storage.port";

/**
 * Factory dle STORAGE_PROVIDER:
 *  - link (default): jen reference → StoragePort se nepoužívá, aktivní je LinkResolver (gdrive/sharepoint).
 *  - local / s3: nativní upload (opt-in, features.nativeFileUpload).
 * gdrive-link je výchozí resolver; sharepoint-link je placeholder (volba nepotvrzena).
 */
export function resolveStorage(): StoragePort | null {
  const { STORAGE_PROVIDER } = loadConfig();
  if (STORAGE_PROVIDER === "link") return null; // jen reference
  throw new Error("resolveStorage: local/s3 adapter — implementace fáze 2 (nativní upload).");
}

export function resolveLinkResolver(): LinkResolverPort {
  throw new Error("resolveLinkResolver: gdrive-link adapter — implementace fáze 2.");
}

export type { StoragePort, LinkResolverPort } from "./storage.port";
