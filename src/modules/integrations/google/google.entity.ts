import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

/** Per-user OAuth připojení (zatím provider 'google'). Refresh token jen šifrovaný. Migrace 0008. */
export const integrationConnections = pgTable("integration_connection", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  externalEmail: text("external_email"),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  scopes: jsonb("scopes").notNull().default([]),
  status: text("status").notNull().default("active"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userProviderUq: uniqueIndex("integration_connection_user_provider_uq").on(t.workspaceId, t.userId, t.provider),
  syncIdx: index("integration_connection_sync_idx2").on(t.provider, t.status),
}));

export type IntegrationConnectionRow = typeof integrationConnections.$inferSelect;
