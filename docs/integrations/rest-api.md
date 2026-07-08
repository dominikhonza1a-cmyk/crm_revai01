# REST API — napojení Make / n8n / Zapier

Interní UI komunikuje přes tRPC; pro externí automatizace slouží **REST fasáda `/api/v1/*`**
(stejné zod validace a služby — žádný duplicitní kontrakt).

## Autentizace

API klíč vytvoříš v **Nastavení → API klíče** (jen admin; plný klíč se zobrazí jedinkrát).
Posílá se v hlavičce:

```
Authorization: Bearer crm_xxxxxxxx…
```

- `GET` vyžaduje scope `read`, `POST` scope `write` (výchozí klíč má oba).
- Klíč je uložen jen jako SHA-256 hash; vytvoření/odvolání se audituje.
- Bez klíče → 401, chybějící scope → 403, validace → 400 (+ `issues`), doménová chyba → 422.

## Endpointy

| Metoda + cesta | Popis | Query / tělo |
|---|---|---|
| `GET /api/v1/organizations` | seznam klientů | `?lifecycleStage=&ownerId=` |
| `POST /api/v1/organizations` | nový klient | `{ "name": "...", "website": "www.firma.cz", ... }` |
| `GET /api/v1/contacts` | kontakty | `?organizationId=` |
| `POST /api/v1/contacts` | nový kontakt | `{ "organizationId", "firstName", "lastName", "email", ... }` |
| `GET /api/v1/deals` | dealy | `?stageId=&organizationId=&ownerId=` |
| `POST /api/v1/deals` | nový deal | `{ "organizationId", "title", "amountMinor": 25000000, "currency": "CZK" }` |
| `GET /api/v1/projects` | projekty | `?organizationId=&status=` |
| `GET /api/v1/tasks` | úkoly/tickety | `?type=support&status=&projectId=&organizationId=` |
| `POST /api/v1/tasks` | nový úkol/**ticket** | `{ "type": "support", "title", "organizationId", "priority": "p1", "channel": "portal" }` |

Pozn.: částky jsou v **minor jednotkách** (haléře) — v JSON jako number/string, v odpovědích string.
`POST /api/v1/tasks` s `type=support` automaticky založí **SLA trackery** dle tieru klienta a pošle notifikace.

## Příklad: ticket z webového formuláře přes n8n

1. n8n **Webhook** node (příjem formuláře) →
2. **HTTP Request** node:
   - Method `POST`, URL `https://crm.automatizace-ai.cz/api/v1/tasks`
   - Header `Authorization: Bearer crm_…`
   - Body (JSON): `{ "type": "support", "title": "{{ $json.subject }}", "organizationId": "<id klienta>", "priority": "p2", "channel": "portal" }`

## Příklad: curl

```bash
curl -s https://crm.automatizace-ai.cz/api/v1/deals \
  -H "Authorization: Bearer crm_…"

curl -s -X POST https://crm.automatizace-ai.cz/api/v1/organizations \
  -H "Authorization: Bearer crm_…" -H "content-type: application/json" \
  -d '{"name":"Nový klient s.r.o.","website":"www.novyklient.cz"}'
```

## Příchozí webhooky (fáze 3 pokr.)
`POST /api/webhooks/{provider}` — email push, Git, generické eventy → timeline. Zatím neaktivní.
