# Integrace — REST API (n8n / Make / Zapier)

Interní komunikace jede přes **tRPC**. Pro externí automatizační nástroje existuje **REST fasáda** `/api/v1/*`
generovaná ze stejných zod schémat (jeden zdroj pravdy, žádný duplicitní kontrakt).

## Autentizace
API klíč (`api-key.entity.ts`) v hlavičce `Authorization: Bearer <key>`. Klíč je vázaný na workspace a má
vlastní permission scope. Vytváří ho admin v Nastavení → Integrace.

## Endpointy (příklad)
```
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/deals?stage=proposal
PATCH  /api/v1/deals/{id}
POST   /api/v1/tasks            # např. založení ticketu z externího formuláře
```
OpenAPI spec: `src/api/rest/openapi.ts` → `/api/v1/openapi.json` (import do Make/Zapier/n8n).

## Webhooky (příchozí)
`POST /api/webhooks/{provider}` — email push, chat events, git, generický. Ověření podpisu v
`webhook-handler.ts`. Payload → `TimelineEvent` (viz workflow [W9](../workflows/catalog.md)).

## Rate limiting & idempotence
Per API klíč rate limit; `Idempotency-Key` hlavička u POST (dedup opakovaných doručení z Make/Zapier).
