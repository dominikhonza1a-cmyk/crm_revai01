import type { DomainEventType } from "@/domain/events";

/**
 * Deklarativní DSL pro automatizace. Definice jsou DATA (lze vypsat, logovat, per-workspace zapnout/vypnout,
 * později editovat v UI / exportovat do n8n). Engine je vyhodnocuje. Viz docs/workflows/engine.md.
 */
export type Trigger =
  | { type: "event"; event: DomainEventType }
  | { type: "schedule"; cron: string };

export type Op = "eq" | "neq" | "gt" | "lt" | "isNull" | "isNotNull" | "in";
export interface Condition { field: string; op: Op; value?: unknown; }

export interface Action {
  type:
    | "create-project-from-template" | "provision-tasks" | "create-task"
    | "notify" | "escalate" | "create-reminder" | "write-timeline"
    | "call-webhook" | "send-email";
  params: Record<string, unknown>;
}

export interface WorkflowDefinition {
  key: string;
  title: string;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  enabledByDefault?: boolean;
}

export function defineWorkflow(def: WorkflowDefinition): WorkflowDefinition {
  return def;
}
