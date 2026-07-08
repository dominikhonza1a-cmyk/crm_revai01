import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { and, isNull, sql, eq } from "drizzle-orm";
import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import { db } from "@/shared/db";
import { runWithTenant, type TenantContext } from "@/shared/tenant-context";
import { asId, type WorkspaceId } from "@/domain/ids";
import { projects } from "@/modules/projects/project.entity";
import { activityService } from "@/modules/activities/activity.service";

/**
 * Příchozí webhooky (W9). Zatím: GitHub → timeline projektu (push, pull_request, release).
 * Mapování repo → projekt: projekt má v custom_fields klíč "git_repo" = "owner/repo"
 * (nastavuje se na projektové kartě). Idempotence přes X-GitHub-Delivery UUID (unique v timeline).
 * Návod: docs/integrations/git.md
 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function verifySignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type GhPayload = {
  repository?: { full_name?: string };
  ref?: string;
  commits?: { message: string; author?: { name?: string } }[];
  pusher?: { name?: string };
  action?: string;
  pull_request?: { number: number; title: string; merged?: boolean; user?: { login?: string } };
  release?: { tag_name?: string; name?: string };
};

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
  const { provider } = await params;
  if (provider !== "github") return json({ error: `Neznámý provider: ${provider}` }, 404);

  const cfg = loadConfig();
  if (!cfg.GITHUB_WEBHOOK_SECRET) return json({ error: "GITHUB_WEBHOOK_SECRET není nastaven" }, 503);

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), cfg.GITHUB_WEBHOOK_SECRET)) {
    return json({ error: "Neplatný podpis" }, 401);
  }

  const event = req.headers.get("x-github-event") ?? "unknown";
  const delivery = req.headers.get("x-github-delivery") ?? randomUUID();
  if (event === "ping") return json({ ok: true, pong: true });

  const payload = JSON.parse(raw) as GhPayload;
  const fullName = payload.repository?.full_name;
  if (!fullName) return json({ ok: true, skipped: "chybí repository" }, 202);

  // repo → projekt (globální lookup; workspace se odvodí z projektu)
  const project = (await db().select({ id: projects.id, workspaceId: projects.workspaceId, organizationId: projects.organizationId })
    .from(projects)
    .where(and(sql`${projects.customFields} ->> 'git_repo' = ${fullName}`, isNull(projects.deletedAt), eq(projects.status, "active")))
    .limit(1))[0]
    ?? (await db().select({ id: projects.id, workspaceId: projects.workspaceId, organizationId: projects.organizationId })
      .from(projects)
      .where(and(sql`${projects.customFields} ->> 'git_repo' = ${fullName}`, isNull(projects.deletedAt)))
      .limit(1))[0];

  if (!project) {
    logger.info("github webhook: nenamapované repo", { fullName, event });
    return json({ ok: true, skipped: `repo ${fullName} není namapované na žádný projekt` }, 202);
  }

  // sestavení timeline záznamu dle typu eventu
  let eventType = "git_push";
  let title = `Git: ${event} (${fullName})`;
  let detail: Record<string, unknown> = { repo: fullName, event };

  if (event === "push") {
    const branch = payload.ref?.replace("refs/heads/", "") ?? "?";
    const count = payload.commits?.length ?? 0;
    if (count === 0) return json({ ok: true, skipped: "push bez commitů (tag/delete)" }, 202);
    title = `Git: ${count} commit${count === 1 ? "" : count < 5 ? "y" : "ů"} → ${branch} (${fullName})`;
    detail = { repo: fullName, branch, pusher: payload.pusher?.name, messages: (payload.commits ?? []).slice(0, 5).map((c) => c.message.split("\n")[0]) };
  } else if (event === "pull_request" && payload.pull_request) {
    const pr = payload.pull_request;
    const stav = payload.action === "closed" ? (pr.merged ? "mergnut" : "zavřen") : payload.action === "opened" ? "otevřen" : payload.action;
    eventType = "git_pr";
    title = `PR #${pr.number} ${stav}: ${pr.title}`;
    detail = { repo: fullName, number: pr.number, action: payload.action, merged: pr.merged ?? false, author: pr.user?.login };
  } else if (event === "release" && payload.release) {
    eventType = "git_release";
    title = `Release ${payload.release.tag_name ?? ""}: ${payload.release.name ?? fullName}`;
    detail = { repo: fullName, tag: payload.release.tag_name };
  }

  const ctx: TenantContext = { workspaceId: asId<WorkspaceId>(project.workspaceId), userId: null, requestId: `webhook:github:${delivery}` };
  await runWithTenant(ctx, () =>
    activityService.writeTimeline(ctx, {
      entityType: "project", entityId: project.id, organizationId: project.organizationId,
      eventType, title, payload: detail,
      sourceType: "integration_event", sourceId: delivery,   // idempotence při GitHub redelivery
    }),
  );

  return json({ ok: true, project: project.id, eventType });
}
