import { ZodError } from "zod";
import { runWithTenant, type TenantContext } from "@/shared/tenant-context";
import { asId, type WorkspaceId } from "@/domain/ids";
import { DomainError, NotFound } from "@/domain/errors";
import { apiKeyService } from "@/modules/security/api-key.service";
import { organizationService } from "@/modules/organizations";
import { organizationCreateSchema } from "@/modules/organizations/organization.validation";
import { contactService } from "@/modules/contacts";
import { contactCreateSchema } from "@/modules/contacts/contact.validation";
import { dealService } from "@/modules/deals";
import { dealCreateSchema } from "@/modules/deals/deal.validation";
import { projectService } from "@/modules/projects";
import { taskService } from "@/modules/tasks";
import { taskCreateSchema } from "@/modules/tasks/task.validation";

/**
 * REST fasáda pro externí automatizace (Make / n8n / Zapier). Auth: Authorization: Bearer crm_…
 * GET vyžaduje scope "read", POST scope "write". Dokumentace: docs/integrations/rest-api.md.
 *
 *   GET  /api/v1/organizations            POST /api/v1/organizations
 *   GET  /api/v1/contacts                 POST /api/v1/contacts
 *   GET  /api/v1/deals                    POST /api/v1/deals
 *   GET  /api/v1/projects
 *   GET  /api/v1/tasks                    POST /api/v1/tasks   (např. založení support ticketu)
 */

/** JSON response s bigint-safe serializací (částky v minor jednotkách → string). */
function json(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "content-type": "application/json" } },
  );
}

async function authenticate(req: Request): Promise<{ ctx: TenantContext; scopes: string[] } | Response> {
  const auth = req.headers.get("authorization");
  const key = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!key) return json({ error: "Chybí Authorization: Bearer <api-key>" }, 401);
  const verified = await apiKeyService.verify(key);
  if (!verified) return json({ error: "Neplatný nebo odvolaný API klíč" }, 401);
  return {
    ctx: { workspaceId: asId<WorkspaceId>(verified.workspaceId), userId: null, requestId: `api:${verified.prefix}` },
    scopes: verified.scopes,
  };
}

async function dispatch(method: string, resource: string, req: Request, ctx: TenantContext): Promise<Response> {
  const url = new URL(req.url);
  const q = (name: string) => url.searchParams.get(name) ?? undefined;

  if (method === "GET") {
    switch (resource) {
      case "organizations": return json(await organizationService.list(ctx, { lifecycleStage: q("lifecycleStage") as never, ownerId: q("ownerId") }));
      case "contacts": return json(await contactService.list(ctx, { organizationId: q("organizationId") }));
      case "deals": return json(await dealService.list(ctx, { stageId: q("stageId"), organizationId: q("organizationId"), ownerId: q("ownerId") }));
      case "projects": return json(await projectService.list(ctx, { organizationId: q("organizationId"), status: q("status") as never }));
      case "tasks": return json(await taskService.list(ctx, { type: q("type") as never, status: q("status") as never, projectId: q("projectId"), organizationId: q("organizationId"), view: "all" }));
    }
  }

  if (method === "POST") {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ error: "Neplatné JSON tělo" }, 400);
    switch (resource) {
      case "organizations": {
        const org = await organizationService.create(ctx, organizationCreateSchema.parse(body));
        return json({ ok: true, id: org.id }, 201);
      }
      case "contacts": {
        const c = await contactService.create(ctx, contactCreateSchema.parse(body));
        return json({ ok: true, id: c.id }, 201);
      }
      case "deals": {
        // JSON neumí bigint — amountMinor přijímáme jako number/string a převedeme
        if (body.amountMinor != null && typeof body.amountMinor !== "bigint") body.amountMinor = BigInt(String(body.amountMinor));
        const d = await dealService.create(ctx, dealCreateSchema.parse(body));
        return json({ ok: true, id: d.id }, 201);
      }
      case "tasks": {
        const t = await taskService.create(ctx, taskCreateSchema.parse(body));
        return json({ ok: true, id: t.taskId }, 201);
      }
    }
  }

  return json({ error: `Neznámý endpoint: ${method} /api/v1/${resource}` }, 404);
}

async function handle(req: Request, { params }: { params: Promise<{ rest: string[] }> }): Promise<Response> {
  const authed = await authenticate(req);
  if (authed instanceof Response) return authed;

  const neededScope = req.method === "GET" ? "read" : "write";
  if (!authed.scopes.includes(neededScope)) return json({ error: `API klíč nemá scope "${neededScope}"` }, 403);

  const { rest } = await params;
  const resource = rest?.[0] ?? "";

  try {
    return await runWithTenant(authed.ctx, () => dispatch(req.method, resource, req, authed.ctx));
  } catch (err) {
    if (err instanceof ZodError) return json({ error: "Validace selhala", issues: err.issues }, 400);
    if (err instanceof NotFound) return json({ error: err.message }, 404);
    if (err instanceof DomainError) return json({ error: err.message, code: err.code }, 422);
    return json({ error: "Interní chyba serveru" }, 500);
  }
}

export { handle as GET, handle as POST };
