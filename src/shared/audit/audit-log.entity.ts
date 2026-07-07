import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/**
 * AuditLog — append-only (migrace 0001). Aplikační DB role by měla mít jen INSERT/SELECT (grant se řeší
 * v migraci/roli). Měsíční partitioning se zapne od ~1M řádků. Viz docs/security/audit-log.md.
 */
export const auditLogs = pgTable("audit_log", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  actorId: uuid("actor_id"),                         // null = systém
  actorType: text("actor_type").notNull().default("user"),  // user | system
  action: text("action").notNull(),                  // enum viz audit.service.ts
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  changes: jsonb("changes"),                         // diff jen citlivých polí
  context: jsonb("context"),                         // { ip, user_agent, request_id }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  wsCreatedIdx: index("audit_ws_created_idx").on(t.workspaceId, t.createdAt),
  entityIdx: index("audit_entity_idx").on(t.workspaceId, t.entityType, t.entityId),
  actionIdx: index("audit_action_idx").on(t.workspaceId, t.action),
}));
