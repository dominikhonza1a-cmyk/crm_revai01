/**
 * Wrapper nad pg-boss (fronty + cron + retry nad PostgreSQL). Žádný Redis, žádný Temporal.
 * Používají: workflow engine (cron triggery), notifikace (digest), recurrence/SLA/overdue joby.
 */
export interface Scheduler {
  /** Registruje cron job (např. denní digest, noční stale-deal). */
  schedule(jobKey: string, cron: string, handler: () => Promise<void>): Promise<void>;
  /** Jednorázový/odložený job s retry (backoff). */
  enqueue<T>(jobKey: string, payload: T, opts?: { runAt?: Date; retryLimit?: number }): Promise<void>;
  /** Registrace workeru pro job. */
  work<T>(jobKey: string, handler: (payload: T) => Promise<void>): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Standardní cron klíče (registrují se ve worker.ts). */
export const CRON_JOBS = {
  overdueTasks: "0 */15 * * * *",       // W4 — každých 15 min
  slaEscalation: "0 */5 * * * *",       // W5 — každých 5 min
  recurringTasks: "0 0 6 * * *",        // W7 — denně 06:00
  accountReview: "0 0 6 * * *",         // W6 — denně 06:00
  staleDeals: "0 0 2 * * *",            // W8 — noční
  dailyDigest: "0 0 * * * *",           // digest — každou hodinu (rozešle uživatelům, jejichž digest_hour == teď)
  retentionReview: "0 0 3 * * *",       // GDPR — noční, plní review frontu (nemaže sám)
} as const;

export const scheduler: Scheduler = {
  async schedule() { throw new Error("scheduler.schedule: zapoj pg-boss ve fázi 2."); },
  async enqueue() { throw new Error("scheduler.enqueue: zapoj pg-boss ve fázi 2."); },
  async work() { throw new Error("scheduler.work: zapoj pg-boss ve fázi 2."); },
  async start() { throw new Error("scheduler.start: zapoj pg-boss ve fázi 2."); },
  async stop() { /* graceful */ },
};
