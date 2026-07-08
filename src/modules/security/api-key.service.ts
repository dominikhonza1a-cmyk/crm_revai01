import { randomBytes, createHash } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { currentWorkspaceId, type TenantContext } from "@/shared/tenant-context";
import { audit } from "@/shared/audit/audit.service";
import { apiKeys } from "./security.entity";

/**
 * API klíče pro REST fasádu (/api/v1/*) — napojení Make/n8n/Zapier.
 * Klíč se ukládá JEN jako SHA-256 hash; plná hodnota se vrací jedinkrát při vytvoření.
 * Formát: crm_<48 hex znaků>; prefix (crm_ + 8) slouží k identifikaci v UI.
 */
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const apiKeyService = {
  async create(ctx: TenantContext, name: string, scopes: string[] = ["read", "write"]): Promise<{ id: string; key: string; prefix: string }> {
    const ws = currentWorkspaceId();
    const key = `crm_${randomBytes(24).toString("hex")}`;
    const prefix = key.slice(0, 12);
    const id = crypto.randomUUID();
    await db().insert(apiKeys).values({
      id, workspaceId: ws, name, prefix, hashedKey: sha256(key), scopes, createdBy: ctx.userId ?? null,
    });
    await audit.audited(ctx, "api_key_created", { type: "api_key", id }, { name: { from: null, to: name } });
    return { id, key, prefix };
  },

  async list() {
    const ws = currentWorkspaceId();
    return db().select({
      id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.workspaceId, ws)).orderBy(desc(apiKeys.createdAt));
  },

  async revoke(ctx: TenantContext, id: string): Promise<void> {
    const ws = currentWorkspaceId();
    await db().update(apiKeys).set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, ws)));
    await audit.audited(ctx, "api_key_revoked", { type: "api_key", id });
  },

  /** Ověření klíče z REST requestu (globální lookup dle hashe — workspace se z klíče odvodí). */
  async verify(rawKey: string): Promise<{ workspaceId: string; scopes: string[]; keyId: string; prefix: string } | null> {
    if (!rawKey?.startsWith("crm_")) return null;
    const row = (await db().select().from(apiKeys)
      .where(and(eq(apiKeys.hashedKey, sha256(rawKey)), isNull(apiKeys.revokedAt))).limit(1))[0];
    if (!row) return null;
    await db().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
    return { workspaceId: row.workspaceId, scopes: (row.scopes ?? []) as string[], keyId: row.id, prefix: row.prefix };
  },
};
