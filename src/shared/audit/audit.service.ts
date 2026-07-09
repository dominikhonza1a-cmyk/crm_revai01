import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { auditLogs } from "./audit-log.entity";
import type { TenantContext } from "@/shared/tenant-context";

/**
 * Zápis do append-only audit logu. Loguje se jen minimum citlivých akcí (docs/security/audit-log.md),
 * diff jen sledovaných polí.
 */
export type AuditAction =
  | "permission_changed" | "role_assigned" | "user_deactivated"
  | "export_executed" | "record_deleted" | "record_hard_deleted"
  | "gdpr_erasure" | "gdpr_export"
  | "deal_stage_changed" | "project_phase_changed" | "project_status_changed"
  | "sla_policy_changed" | "sla_overridden" | "document_secret_ref_changed"
  | "integration_connected" | "integration_revoked" | "import_executed" | "settings_changed"
  | "api_key_created" | "api_key_revoked" | "secret_revealed";

export interface EntityRef { type: string; id: string; }
export type FieldDiff = Record<string, { from: unknown; to: unknown }>;

export interface AuditService {
  audited(ctx: TenantContext, action: AuditAction, entity: EntityRef | null, changes?: FieldDiff): Promise<void>;
}

export const audit: AuditService = {
  async audited(ctx, action, entity, changes) {
    await db().insert(auditLogs).values({
      id: randomUUID(),
      workspaceId: ctx.workspaceId,
      actorId: ctx.userId ?? null,
      actorType: ctx.userId ? "user" : "system",
      action,
      entityType: entity?.type ?? null,
      entityId: entity?.id ?? null,
      changes: changes ?? null,
      context: { ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId },
    });
  },
};
