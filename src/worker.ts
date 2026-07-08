import PgBoss from "pg-boss";
import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import { bootstrap } from "@/api/bootstrap";
import { runSlaEscalation, runOverdueTasks, runRecurringTasks, runStaleDeals, runDailyDigest, runDispatchPending } from "@/workflows/jobs";

/**
 * WORKER proces (druhý proces vedle webu, `npm run worker`).
 * pg-boss = cron + fronty + retry NAD stejným PostgreSQL (Supabase) — žádný Redis.
 * Připojuje se přes DIRECT_URL (session pooler); transaction pooler pg-boss nepodporuje.
 */
const JOBS: { name: string; cron: string; run: () => Promise<unknown> }[] = [
  { name: "sla-escalation", cron: "*/5 * * * *", run: () => runSlaEscalation() },    // W5 — každých 5 min
  { name: "overdue-tasks", cron: "*/15 * * * *", run: () => runOverdueTasks() },     // W4 — každých 15 min
  { name: "recurring-tasks", cron: "0 6 * * *", run: () => runRecurringTasks() },    // W7 — denně 6:00
  { name: "stale-deals", cron: "0 2 * * *", run: () => runStaleDeals() },            // W8 — noční
  { name: "daily-digest", cron: "0 7 * * *", run: () => runDailyDigest() },          // digest — 7:00
  { name: "dispatch-pending", cron: "*/10 * * * *", run: () => runDispatchPending() }, // retry nedoručených
];

async function main(): Promise<void> {
  const cfg = loadConfig();
  bootstrap(); // event subscriby (W2 deal.won → projekt) i ve workeru

  const boss = new PgBoss({ connectionString: cfg.DIRECT_URL, schema: "pgboss" });
  boss.on("error", (err) => logger.error("pg-boss error", { err: String(err) }));
  await boss.start();

  for (const job of JOBS) {
    await boss.createQueue(job.name).catch(() => { /* queue už existuje */ });
    await boss.schedule(job.name, job.cron, undefined, { tz: cfg.DEFAULT_TIMEZONE });
    await boss.work(job.name, async () => {
      logger.info(`job start: ${job.name}`);
      await job.run();
      logger.info(`job done: ${job.name}`);
    });
  }

  logger.info("worker: ready", { jobs: JOBS.map((j) => j.name) });

  const shutdown = async () => { logger.info("worker: stopping"); await boss.stop(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error("worker: bootstrap failed", { err: String(err) });
  process.exit(1);
});
