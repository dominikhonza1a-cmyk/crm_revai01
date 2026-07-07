import { AsyncLocalStorage } from "node:async_hooks";
import type { WorkspaceId, UserId } from "@/domain/ids";
import { TenantIsolationViolation } from "@/domain/errors";

/**
 * Nese workspace_id + aktuálního uživatele skrz celý request/job bez explicitního předávání.
 * KAŽDÝ repository dotaz čte workspaceId odtud (viz TenantScopedRepository). Toto je páteř multi-tenancy.
 */
export interface TenantContext {
  workspaceId: WorkspaceId;
  userId: UserId | null;   // null = systémový job
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

const als = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => Promise<T>): Promise<T> {
  return als.run(ctx, fn);
}

export function currentTenant(): TenantContext {
  const ctx = als.getStore();
  if (!ctx) throw new TenantIsolationViolation();
  return ctx;
}

export function currentWorkspaceId(): WorkspaceId {
  return currentTenant().workspaceId;
}
