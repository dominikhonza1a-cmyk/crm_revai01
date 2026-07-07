import { defineWorkflow } from "../dsl";
import { CRON_JOBS } from "@/shared/scheduler";

/** W5: Support SLA breach risk. 75 % → warning, 100 % → breach. Business hours + pauzy. Viz docs/workflows/sla.md. */
export const slaBreachRisk = defineWorkflow({
  key: "sla-breach-risk",
  title: "Support SLA breach risk",
  trigger: { type: "schedule", cron: CRON_JOBS.slaEscalation },
  conditions: [
    { field: "slaTracker.status", op: "eq", value: "running" },
    { field: "slaTracker.metric", op: "in", value: ["first_response", "resolution"] },
  ],
  actions: [
    { type: "escalate", params: { source: "sla_tracker" } },
    { type: "write-timeline", params: { eventType: "sla_breached", onlyAtPct: 100 } },
    { type: "notify", params: { category: "sla_warning", atPct: 75 } },
    { type: "notify", params: { category: "sla_breach", atPct: 100 } },
  ],
  enabledByDefault: true,
});
