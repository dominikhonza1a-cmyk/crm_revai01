# Nasazení na Netlify — crm.automatizace-ai.cz

Doména `automatizace-ai.cz` už běží na **Netlify DNS** (nameservery nsone.net — ověřeno), takže subdoména
`crm.automatizace-ai.cz` je otázka pár kliků. Web (Next.js) hostuje Netlify; automatizační joby místo
trvalého workeru spouští **Netlify Scheduled Functions** (cron) přes chráněný endpoint `/api/jobs`.
Repo je připravené: `netlify.toml`, `netlify/functions/cron-*.mjs`, `src/app/api/jobs/route.ts`.

## Postup (klikací, ~15 minut)

### 1. Nový site z GitHubu
1. Netlify → **Add new site → Import an existing project → GitHub** → vyber repo `crm_revai01`.
2. Build nastavení se načte z `netlify.toml` (build `npm run build`) — nech beze změny.
3. Zatím **neklikej Deploy** — nejdřív env proměnné (krok 2).

### 2. Environment variables (Site configuration → Environment variables)
Zkopíruj hodnoty ze svého lokálního `.env` (Import from a .env file to umí najednou):

| Proměnná | Hodnota |
|---|---|
| `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | jako lokálně |
| `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | jako lokálně |
| `SUPABASE_SECRET_KEY` | jako lokálně |
| `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432) | jako lokálně |
| `APP_URL` | `https://crm.automatizace-ai.cz` |
| `AUTH_PROVIDER` | `supabase` |
| `TENANCY_MODE` | `single` |
| `SEED_WORKSPACE_NAME`, `SEED_OWNER_EMAILS` | jako lokálně |
| `CRON_SECRET` | **nový náhodný token** (např. `openssl rand -hex 24`) |
| `CHAT_PROVIDER` / `CHAT_WEBHOOK_URL` | `webhook` + Slack URL (až bude) |
| `EMAIL_PROVIDER` / `SMTP_URL` / `SMTP_FROM` | `smtp` + údaje (až budou; do té doby `console`) |
| `DEFAULT_TIMEZONE`, `DEFAULT_CURRENCY`, `SECRETS_BACKEND`, `STORAGE_PROVIDER` | jako lokálně |

Pak **Deploy site**.

### 3. Subdoména
Site → **Domain management → Add a domain → `crm.automatizace-ai.cz`**. Protože DNS domény je na Netlify,
záznam se vytvoří automaticky; HTTPS certifikát (Let's Encrypt) se vystaví sám během pár minut.

### 4. Supabase — povolit novou URL
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://crm.automatizace-ai.cz`
- **Redirect URLs**: přidat `https://crm.automatizace-ai.cz/**` (a ponechat `http://localhost:3000/**` pro vývoj).

### 5. Ověření
- `https://crm.automatizace-ai.cz/api/trpc/health` → `{"ok":true}`
- `/login` → přihlášení → dashboard.
- Netlify → **Logs → Functions** → po pár minutách uvidíš běhy `cron-frequent` (200).

## Jak fungují joby na Netlify
- `cron-frequent` (*/5 min): SLA eskalace + overdue + doručení notifikací
- `cron-daily` (5:00 UTC): recurring tasky + stale dealy
- `cron-digest` (6:00 UTC): denní e-mailový digest
Každá funkce jen zavolá `POST /api/jobs?job=…` s hlavičkou `x-cron-secret`. Bez platného `CRON_SECRET`
endpoint odmítne (403/503). Pozn.: free tier má limit 10 s na funkci — naše joby běží < 2 s; kdyby v budoucnu
narostly, přesuneme worker na Railway/Fly.io (repo má i pg-boss worker pro self-host).

## Lokální vývoj po nasazení
Nic se nemění: `npm run dev` (+ volitelně `npm run worker` nebo `scripts/run-jobs.ts`). Produkce jede z GitHubu —
každý push do `main` = automatický deploy.
