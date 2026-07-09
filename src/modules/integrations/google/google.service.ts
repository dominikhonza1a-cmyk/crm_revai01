import { createHmac, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { loadConfig } from "@/config/app.config";
import { db } from "@/shared/db";
import { encryptSecret, decryptSecret } from "@/shared/crypto";
import { audit } from "@/shared/audit/audit.service";
import { currentWorkspaceId, type TenantContext } from "@/shared/tenant-context";
import { ValidationFailed } from "@/domain/errors";
import { integrationConnections } from "./google.entity";

/**
 * Google OAuth (Gmail + Calendar, readonly). Flow: tRPC vrátí auth URL se signovaným state
 * (HMAC, obsahuje userId+workspaceId) → Google consent → GET /api/integrations/google/callback
 * → výměna code za tokeny → refresh token šifrovaně do integration_connection.
 */
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function cfgOrThrow() {
  const cfg = loadConfig();
  if (!cfg.GOOGLE_CLIENT_ID || !cfg.GOOGLE_CLIENT_SECRET) throw new ValidationFailed("Google OAuth není nakonfigurován (GOOGLE_CLIENT_ID/SECRET).");
  if (!cfg.TOKEN_ENCRYPTION_KEY) throw new ValidationFailed("TOKEN_ENCRYPTION_KEY není nastaven.");
  return cfg;
}

const redirectUri = () => `${loadConfig().APP_URL}/api/integrations/google/callback`;

function signState(payload: string): string {
  return createHmac("sha256", cfgOrThrow().TOKEN_ENCRYPTION_KEY!).update(payload).digest("hex");
}

export function buildState(ctx: TenantContext): string {
  const payload = Buffer.from(JSON.stringify({ u: ctx.userId, w: ctx.workspaceId, t: Date.now() })).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function verifyState(state: string): { userId: string; workspaceId: string } {
  const [payload, sig] = state.split(".");
  if (!payload || !sig || signState(payload) !== sig) throw new ValidationFailed("Neplatný state (CSRF).");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; w: string; t: number };
  if (Date.now() - data.t > 15 * 60_000) throw new ValidationFailed("State vypršel, zkus připojení znovu.");
  return { userId: data.u, workspaceId: data.w };
}

async function tokenRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Google token endpoint ${res.status}: ${json.error ?? ""} ${json.error_description ?? ""}`);
  return json;
}

export const googleService = {
  authUrl(ctx: TenantContext): { url: string } {
    const cfg = cfgOrThrow();
    const q = new URLSearchParams({
      client_id: cfg.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES.join(" "),
      state: buildState(ctx),
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${q}` };
  },

  /** Zpracování callbacku (běží už v runWithTenant dle state). Vrací e-mail připojeného účtu. */
  async handleCallback(ctx: TenantContext, code: string): Promise<{ email: string | null }> {
    const cfg = cfgOrThrow();
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code,
      client_id: cfg.GOOGLE_CLIENT_ID!,
      client_secret: cfg.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
    });
    const refreshToken = tokens.refresh_token as string | undefined;
    if (!refreshToken) throw new ValidationFailed("Google nevrátil refresh token — odpoj aplikaci na myaccount.google.com/permissions a zkus to znovu.");

    let email: string | null = null;
    try {
      const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { authorization: `Bearer ${tokens.access_token as string}` },
      });
      if (ui.ok) email = ((await ui.json()) as { email?: string }).email ?? null;
    } catch { /* e-mail je jen kosmetika */ }

    const ws = currentWorkspaceId();
    const existing = (await db().select({ id: integrationConnections.id }).from(integrationConnections)
      .where(and(eq(integrationConnections.workspaceId, ws), eq(integrationConnections.userId, ctx.userId!), eq(integrationConnections.provider, "google"))).limit(1))[0];

    const values = {
      externalEmail: email, refreshTokenEnc: encryptSecret(refreshToken),
      scopes: SCOPES, status: "active", lastError: null, updatedAt: new Date(),
    };
    if (existing) await db().update(integrationConnections).set(values).where(eq(integrationConnections.id, existing.id));
    else await db().insert(integrationConnections).values({ id: randomUUID(), workspaceId: ws, userId: ctx.userId!, provider: "google", ...values });

    await audit.audited(ctx, "integration_connected", { type: "integration", id: existing?.id ?? "google" }, { provider: { from: null, to: "google" } });
    return { email };
  },

  async status(ctx: TenantContext) {
    const ws = currentWorkspaceId();
    const row = (await db().select({
      externalEmail: integrationConnections.externalEmail, status: integrationConnections.status,
      lastSyncedAt: integrationConnections.lastSyncedAt, lastError: integrationConnections.lastError,
    }).from(integrationConnections)
      .where(and(eq(integrationConnections.workspaceId, ws), eq(integrationConnections.userId, ctx.userId!), eq(integrationConnections.provider, "google"))).limit(1))[0];
    return row ? { connected: true as const, ...row } : { connected: false as const };
  },

  async disconnect(ctx: TenantContext): Promise<void> {
    const ws = currentWorkspaceId();
    const row = (await db().select().from(integrationConnections)
      .where(and(eq(integrationConnections.workspaceId, ws), eq(integrationConnections.userId, ctx.userId!), eq(integrationConnections.provider, "google"))).limit(1))[0];
    if (!row) return;
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptSecret(row.refreshTokenEnc))}`, { method: "POST" });
    } catch { /* revokace best-effort; mazání tokenu je hlavní */ }
    await db().delete(integrationConnections).where(eq(integrationConnections.id, row.id));
    await audit.audited(ctx, "integration_revoked", { type: "integration", id: row.id }, { provider: { from: "google", to: null } });
  },

  /** Access token z refresh tokenu (pro sync joby). */
  async accessToken(refreshTokenEnc: string): Promise<string> {
    const cfg = cfgOrThrow();
    const tokens = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: decryptSecret(refreshTokenEnc),
      client_id: cfg.GOOGLE_CLIENT_ID!,
      client_secret: cfg.GOOGLE_CLIENT_SECRET!,
    });
    return tokens.access_token as string;
  },
};
