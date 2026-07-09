import { router, protectedProcedure, requirePermission } from "@/api/trpc";
import { googleService } from "./google.service";
import { runGoogleSync } from "./google-sync.job";

/** tRPC router integrací. Google připojení je per-user (každý si připojí svůj účet). */
export const integrationsRouter = router({
  googleStatus: protectedProcedure.query(({ ctx }) => googleService.status(ctx)),

  googleAuthUrl: protectedProcedure.mutation(({ ctx }) => googleService.authUrl(ctx)),

  googleDisconnect: protectedProcedure.mutation(({ ctx }) => googleService.disconnect(ctx)),

  // ruční spuštění synchronizace (jinak běží automaticky v frequent jobu)
  googleSyncNow: protectedProcedure.use(requirePermission("settings", "manage"))
    .mutation(() => runGoogleSync()),
});
