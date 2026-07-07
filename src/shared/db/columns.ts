import { uuid, timestamp } from "drizzle-orm/pg-core";

/**
 * Společné sloupce sdílené všemi tabulkami (konvence z docs/data-model/conventions.md).
 * Rozprostři je do každé pgTable přes spread: `{ ...tenantColumns, ...auditColumns, ...softDelete, ... }`.
 */

/** Tenancy — workspace_id ve VŠECH tabulkách kromě workspace samotné. */
export const tenantColumns = {
  workspaceId: uuid("workspace_id").notNull(),
};

/** created/updated + kdo. UUIDv7 PK generuje aplikace (branded ids), default gen_random_uuid jako fallback. */
export const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};

/** Soft delete — provozní entity. Unikátní indexy musí být partial (WHERE deleted_at IS NULL). */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
