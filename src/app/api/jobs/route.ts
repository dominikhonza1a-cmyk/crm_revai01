import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import { runSlaEscalation, runOverdueTasks, runDispatchPending, runRecurringTasks, runStaleDeals, runDailyDigest, runRetainerBilling } from "@/workflows/jobs";
import { runGoogleSync } from "@/modules/integrations/google/google-sync.job";

/**
 * Spouštěč automatizačních jobů přes HTTP — pro serverless nasazení (Netlify cron funkce).
 * Self-hosted alternativa je worker (pg-boss). Chráněno hlavičkou x-cron-secret (env CRON_SECRET).
 *
 *   POST /api/jobs?job=frequent  → SLA eskalace + overdue + doručení čekajících (každých ~5–15 min)
 *   POST /api/jobs?job=daily     → recurring tasky + stale dealy (1× denně ráno)
 *   POST /api/jobs?job=digest    → denní e-mailový digest (1× denně)
 */
export async function POST(req: Request): Promise<Response> {
  const cfg = loadConfig();
  if (!cfg.CRON_SECRET) return new Response("CRON_SECRET není nastaven", { status: 503 });
  if (req.headers.get("x-cron-secret") !== cfg.CRON_SECRET) return new Response("forbidden", { status: 403 });

  const job = new URL(req.url).searchParams.get("job");
  const t0 = Date.now();
  switch (job) {
    case "frequent":
      await runSlaEscalation();
      await runOverdueTasks();
      await runDispatchPending();
      await runGoogleSync();
      break;
    case "daily":
      await runRecurringTasks();
      await runStaleDeals();
      await runRetainerBilling();
      break;
    case "digest":
      await runDailyDigest();
      break;
    default:
      return new Response("neznámý job (frequent|daily|digest)", { status: 400 });
  }
  logger.info("jobs endpoint hotov", { job, ms: Date.now() - t0 });
  return Response.json({ ok: true, job, ms: Date.now() - t0 });
}
