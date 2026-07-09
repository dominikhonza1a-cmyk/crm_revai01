import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import { runWithTenant, type TenantContext } from "@/shared/tenant-context";
import { asId, type WorkspaceId, type UserId } from "@/domain/ids";
import { googleService, verifyState } from "@/modules/integrations/google/google.service";

/** OAuth callback z Googlu. Ověří signovaný state (CSRF), vymění code za tokeny, uloží připojení. */
export async function GET(req: Request): Promise<Response> {
  const cfg = loadConfig();
  const url = new URL(req.url);
  const back = (q: string) => Response.redirect(`${cfg.APP_URL}/settings?google=${q}`, 302);

  if (url.searchParams.get("error")) return back("denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return back("error");

  try {
    const { userId, workspaceId } = verifyState(state);
    const ctx: TenantContext = { workspaceId: asId<WorkspaceId>(workspaceId), userId: asId<UserId>(userId), requestId: "google-callback" };
    await runWithTenant(ctx, () => googleService.handleCallback(ctx, code));
    return back("connected");
  } catch (err) {
    logger.warn("google callback selhal", { err: String((err as Error)?.message ?? err) });
    return back("error");
  }
}
