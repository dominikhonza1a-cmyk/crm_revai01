import type { TenantContext } from "@/shared";

/**
 * Use-casy modulu integrations. Connect/revoke (audit), email sync párování, příjem webhooků.
 * Tokeny se ukládají do secret store, do DB jen credential_ref.
 */
export interface IntegrationService {
  connect(ctx: TenantContext, provider: string, credentialRef: string): Promise<void>;   // audit integration_connected
  revoke(ctx: TenantContext, connectionId: string): Promise<void>;                        // audit integration_revoked
  handleWebhook(provider: string, payload: unknown, signature: string): Promise<void>;    // W9 → timeline
}

export const integrationService: IntegrationService = {
  async connect(_ctx, _p, _ref) { throw new Error("integrationService.connect: fáze 1–3."); },
  async revoke(_ctx, _id) { throw new Error("integrationService.revoke: fáze 1–3."); },
  async handleWebhook(_p, _payload, _sig) { throw new Error("integrationService.handleWebhook: fáze 3 (ověř podpis → timeline)."); },
};
