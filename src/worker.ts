/**
 * Entrypoint WORKER procesu (druhý proces ze stejného image jako web).
 * Zodpovědnosti:
 *  - outbox dispatcher: čte transactional outbox → doručuje eventy subscriberům + workflow enginu
 *  - scheduler (pg-boss): registruje cron joby (overdue W4, SLA W5, recurring W7, account review W6,
 *    stale deals W8, denní digest, retention review)
 *  - graceful shutdown
 */
import { scheduler, CRON_JOBS } from "@/shared/scheduler";
import { logger } from "@/shared/logger";

async function bootstrap(): Promise<void> {
  logger.info("worker: start");

  // 1) registrace modulových subscriberů (event bus)
  //    registerActivityWorkflows(); registerProjectWorkflows(); ...

  // 2) cron joby
  await scheduler.schedule("overdue-tasks", CRON_JOBS.overdueTasks, async () => {/* W4 */});
  await scheduler.schedule("sla-escalation", CRON_JOBS.slaEscalation, async () => {/* W5 */});
  await scheduler.schedule("recurring-tasks", CRON_JOBS.recurringTasks, async () => {/* W7 */});
  await scheduler.schedule("account-review", CRON_JOBS.accountReview, async () => {/* W6 */});
  await scheduler.schedule("stale-deals", CRON_JOBS.staleDeals, async () => {/* W8 */});
  await scheduler.schedule("daily-digest", CRON_JOBS.dailyDigest, async () => {/* digest */});
  await scheduler.schedule("retention-review", CRON_JOBS.retentionReview, async () => {/* GDPR */});

  // 3) outbox dispatcher (poll/notify → eventBus.dispatch)

  await scheduler.start();
  logger.info("worker: ready");
}

bootstrap().catch((err) => {
  logger.error("worker: bootstrap failed", { err: String(err) });
  process.exitCode = 1;
});
