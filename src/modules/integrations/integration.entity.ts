/**
 * Drizzle table pro Integration (katalogový záznam) + IntegrationConnection (připojený účet).
 * IntegrationConnection.credential_ref = ODKAZ do secret store, NIKDY plaintext token.
 * MVP providery: gmail, outlook, slack_webhook. Ostatní later.
 */
export const INTEGRATION_ENTITY_NOTE = "Integration + IntegrationConnection; credential_ref (secret store), ne token.";
