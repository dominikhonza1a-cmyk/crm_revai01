import { currentWorkspaceId } from "./tenant-context";
import type { Page, PageParams } from "./pagination";

/**
 * Základ všech repository. KAŽDÝ dotaz automaticky filtruje `workspace_id` z tenant-contextu
 * (páteř multi-tenancy — viz docs/data-model/multi-tenancy.md) a default scope `deleted_at IS NULL`.
 * Repository je JEDINÉ místo se SQL; service na něj volá přes interface.
 */
export interface TenantScopedRepository<T, CreateInput, UpdateInput, Filter> {
  findById(id: string): Promise<T | null>;
  list(filter: Filter, page?: PageParams): Promise<Page<T>>;
  create(input: CreateInput): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}

/** Helper — vrací workspaceId, které se přidá do každého WHERE. */
export function scope(): { workspaceId: string } {
  return { workspaceId: currentWorkspaceId() };
}
