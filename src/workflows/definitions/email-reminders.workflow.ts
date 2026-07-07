import { defineWorkflow } from "../dsl";
import { CRON_JOBS } from "@/shared/scheduler";

/**
 * W8 + připomínky: stale-deal reminder (sales follow-up) + odeslání splatných Reminderů e-mailem.
 * Stale = now > stage_entered_at + pipeline_stage.stale_after_days a last_activity_at starší než práh.
 */
export const emailReminders = defineWorkflow({
  key: "email-reminders",
  title: "Připomínky e-mailem (stale dealy + splatné remindery)",
  trigger: { type: "schedule", cron: CRON_JOBS.staleDeals },
  conditions: [],
  actions: [
    { type: "create-reminder", params: { source: "stale_deal_rule", target: "deal.owner" } },
    { type: "notify", params: { category: "deal_stale" } },
    { type: "send-email", params: { dueReminders: true } },
  ],
  enabledByDefault: true,
});
