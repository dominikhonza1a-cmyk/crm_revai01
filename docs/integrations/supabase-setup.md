# Nastavení Supabase (co uděláte vy)

CRM používá Supabase jako **managed PostgreSQL + autentizaci**. Byznys logika běží v naší app (ne v RLS/edge).

## 1. Založení projektu
1. https://supabase.com → **New project**.
2. **Region: EU (Frankfurt / eu-central-1)** — kvůli GDPR (data v EU).
3. Zvol silné DB heslo (ulož do 1Password / Vault — do gitu nikdy).

## 2. Klíče a connection stringy → do `.env`
Project Settings → **API** (nový formát klíčů):
- `SUPABASE_URL` = Project URL
- `SUPABASE_PUBLISHABLE_KEY` = Publishable key `sb_publishable_…` (jde i do frontendu jako `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SECRET_KEY` = Secret key `sb_secret_…` (**jen server**, nikdy do prohlížeče/gitu)

Project Settings → **Database → Connection string**:
- `DATABASE_URL` = **Transaction pooler** (port 6543) — pro web app
- `DIRECT_URL` = **Direct connection / Session pooler** (port 5432) — pro migrace a worker

Do `.env` přidej i pro frontend:
```
NEXT_PUBLIC_SUPABASE_URL=<stejné jako SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

## 3. Auth nastavení (Supabase → Authentication)
- **Providers → Email**: zapnout (email + heslo). Doporučeno „Confirm email".
- **Multi-Factor Auth → TOTP**: zapnout → uživatelé si spárují Google Authenticator / 1Password.
- **URL Configuration → Site URL**: `https://crm.vasedomena.cz` (nebo `http://localhost:3000` pro dev) — login běží na vaší doméně.
- (Později) **Providers → Google**: OAuth pro „Přihlásit se Googlem" — přidá se bez zásahu do kódu.
- (Volitelně) **SMTP**: vlastní odesílatel e-mailů (jinak Supabase default).

## 4. Migrace + seed
```bash
cp .env.example .env      # doplň hodnoty z kroků 2–3
npm install
npm run db:migrate        # spustí db/migrations/0001_init.sql přes DIRECT_URL
npm run db:seed           # workspace + owner účty (SEED_OWNER_EMAILS) + role (admin ownerům)
```

## 5. Pozvání owner účtů
Owner e-maily z `SEED_OWNER_EMAILS` jsou v DB jako `invited`. Pozvi je v **Supabase → Authentication → Users → Invite**
(nebo přes `AuthProvider.inviteUser`). Při prvním přihlášení se `app_user` napojí na `auth.users` dle e-mailu
a status přejde na `active` (viz [../../src/api/context.ts](../../src/api/context.ts)).

## 6. Ověření
```bash
npm run dev               # web (Next.js) + npm run worker (joby) zvlášť
```
- `GET /api/trpc/health` → `{ ok: true }`
- Přihlaš se na `/login`, po přihlášení `me` vrátí tvoji roli (admin) a moduly.

> **Poznámka:** worker (pg-boss, fáze 2) se připojuje přes `DIRECT_URL` (session mode) — transaction pooler
> nepodporuje `LISTEN/NOTIFY` a advisory locks.
