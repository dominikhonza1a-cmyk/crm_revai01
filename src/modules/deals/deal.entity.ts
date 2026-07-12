import { pgTable, uuid, text, char, bigint, integer, numeric, date, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { tenantColumns, auditColumns, softDelete } from "@/shared/db/columns";

/**
 * PipelineStage (řádky) + Deal. Migrace 0002.
 * deal.created_project_id UNIQUE (idempotence Won→Project); stage_entered_at reset při změně stage.
 */
export const pipelineStages = pgTable("pipeline_stage", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  name: text("name").notNull(),
  position: integer("position").notNull(),
  kind: text("kind").notNull(),                       // open | won | lost
  probabilityDefault: integer("probability_default").notNull().default(0),
  staleAfterDays: integer("stale_after_days"),
  ...auditColumns,
});

export const deals = pgTable("deal", {
  id: uuid("id").primaryKey(),
  ...tenantColumns,
  organizationId: uuid("organization_id").notNull(),
  primaryContactId: uuid("primary_contact_id"),
  pipelineStageId: uuid("pipeline_stage_id").notNull(),
  title: text("title").notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }),
  currency: char("currency", { length: 3 }),
  expectedMarginPct: numeric("expected_margin_pct"),
  probability: integer("probability").notNull().default(0),
  expectedCloseDate: date("expected_close_date"),
  ownerId: uuid("owner_id"),
  source: text("source"),
  projectTypeHint: text("project_type_hint"),
  stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  lostReason: text("lost_reason"),
  lostNote: text("lost_note"),
  wonAt: timestamp("won_at", { withTimezone: true }),
  lostAt: timestamp("lost_at", { withTimezone: true }),
  createdProjectId: uuid("created_project_id"),
  notes: text("notes"),
  customFields: jsonb("custom_fields").notNull().default({}),
  ...auditColumns,
  ...softDelete,
}, (t) => ({
  stageIdx: index("deal_stage_idx").on(t.workspaceId, t.pipelineStageId),
  ownerIdx: index("deal_owner_idx").on(t.workspaceId, t.ownerId),
}));

export type DealRow = typeof deals.$inferSelect;
export type DealInsert = typeof deals.$inferInsert;
export type PipelineStageRow = typeof pipelineStages.$inferSelect;
