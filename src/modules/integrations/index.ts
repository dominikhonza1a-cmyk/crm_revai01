/**
 * Modul INTEGRATIONS — email (Gmail/Outlook), chat webhook (MVP); kalendář/Git/Zapier (fáze 3).
 * Soubory: integration.entity.ts (+ IntegrationConnection) · integration.service.ts (connect/revoke/webhook) ·
 *          email-sync.service.ts · provider.registry.ts · webhook-handler.ts.
 * Adaptéry (porty + impl) žijí v src/adapters/*; tento modul drží stav připojení a párování.
 */
export { integrationService } from "./integration.service";
export { emailSync } from "./email-sync.service";
export function registerModule(): void {}

export const INTEGRATIONS_ROUTER_NOTE = "integrations.{list,connect,revoke,test}; webhooky přes /api/webhooks/{provider}.";
