import type { DomainEvent } from "@/domain/events";
import type { WorkflowDefinition } from "./dsl";

/**
 * Vyhodnocení workflowů. Konzumuje eventy z outboxu / cron ticky.
 * Idempotence: workflow_runs.idempotency_key = event_id + workflow_key (unique) → workflow se nespustí 2×.
 * Selhání akce → retry s backoffem (pg-boss); po vyčerpání → failed + alert v Settings → Workflows.
 */
export interface WorkflowRun {
  id: string;
  workflowKey: string;
  idempotencyKey: string;
  status: "running" | "completed" | "failed";
  error?: string;
}

export interface WorkflowEngine {
  handleEvent(event: DomainEvent): Promise<void>;
  runScheduled(cron: string): Promise<void>;
  evaluate(def: WorkflowDefinition, ctx: unknown): Promise<boolean>;   // conditions
}

export const engine: WorkflowEngine = {
  async handleEvent(_event) { throw new Error("engine.handleEvent: implementace fáze 2."); },
  async runScheduled(_cron) { throw new Error("engine.runScheduled: implementace fáze 2."); },
  async evaluate(_def, _ctx) { throw new Error("engine.evaluate: implementace fáze 2 (conditions)."); },
};
