# Git integrace — GitHub webhooky → timeline projektu

Commity, pull requesty a release z GitHubu se propisují do **timeline projektu** v CRM.
Endpoint: `POST /api/webhooks/github` (podpis HMAC-SHA256, idempotence přes `X-GitHub-Delivery`).

## Nastavení (jednorázově, ~5 minut)

### 1. Secret
Vygeneruj náhodný token (`openssl rand -hex 20`) a nastav ho jako `GITHUB_WEBHOOK_SECRET`:
- lokálně v `.env`,
- v **Netlify → Environment variables** (+ Trigger deploy).

### 2. Webhook v GitHub repu
GitHub → repo → **Settings → Webhooks → Add webhook**:
| Pole | Hodnota |
|---|---|
| Payload URL | `https://crm.automatizace-ai.cz/api/webhooks/github` |
| Content type | `application/json` |
| Secret | stejný token jako `GITHUB_WEBHOOK_SECRET` |
| Events | „Let me select…" → **Pushes** + **Pull requests** (+ Releases) |

Po uložení GitHub pošle `ping` — v Recent Deliveries má být zelená 200.

### 3. Mapování repa na projekt v CRM
Projektová karta → **Přehled → Git repo** → vyplň `owner/repo` (např. `dominikhonza1a-cmyk/crm_revai01`) → Uložit.

## Co se pak děje
- **push** → timeline: „Git: 3 commity → main (owner/repo)" + prvních 5 commit messages v payloadu
- **pull request** → „PR #12 otevřen/mergnut/zavřen: titulek"
- **release** → „Release v1.2.0: …"
- Nenamapované repo se ignoruje (202), redelivery nevytvoří duplikát.

Webhook lze přidat do libovolného počtu rep — každé se mapuje na svůj projekt.
