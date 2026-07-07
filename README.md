# revai_CRM

Interní CRM pro AI automatizační agenturu. Pokrývá klienty, projekty (sub-karty pod klientem),
tasky a support tickety, deal pipeline, agregovanou timeline, dokumenty (reference na externí úložiště),
integrace, automatizace/workflowy, SLA, permissions, audit log, GDPR a reporting.

> **Stav:** scaffold + návrh (KROK C). Kód je záměrně z velké části stub — definuje rozhraní,
> schémata a odpovědnosti. Implementace probíhá po fázích (viz
> [docs/product/implementation-strategy.md](docs/product/implementation-strategy.md)).

## Design principy

- **Méně modulů, jasné entity, nezahltit.** UI česky, kód anglicky.
- **Self-hosted first, SaaS-ready.** `workspace_id` (tenant) ve všech entitách od první migrace.
- **Stack-agnostické jádro.** `src/domain` nemá žádné závislosti; frameworky žijí na okrajích.
- **Bezpečnost by default.** Secrets nikdy jako obsah — jen reference. PII maskované pro dev roli.
  Audit append-only. Dokumenty primárně jako reference na externí úložiště.

## Stack (potvrzeno)

TypeScript monolit: **Next.js (App Router) + tRPC + Drizzle ORM + Supabase (PostgreSQL + Auth) + pg-boss**.
- **Supabase** = managed Postgres (EU/Frankfurt) + autentizace (email/heslo, TOTP MFA, později Google OAuth).
- Byznys logika (workflowy, SLA, audit, RBAC) běží v **naší app**, ne v Supabase RLS/edge.
- **pg-boss** (fronty/cron/outbox) běží nad stejným Postgres — žádný Redis.

Nastavení Supabase krok za krokem: [docs/integrations/supabase-setup.md](docs/integrations/supabase-setup.md).

## Kde začít číst

| Chci pochopit… | Dokument |
|---|---|
| Celkovou architekturu, MVP vs. advanced, UX | [docs/product/architecture-overview.md](docs/product/architecture-overview.md) |
| Datový model (entity, pole, vazby) | [docs/data-model/entities.md](docs/data-model/entities.md) |
| ER diagram | [docs/data-model/erd.md](docs/data-model/erd.md) |
| Workflowy a automatizace | [docs/workflows/catalog.md](docs/workflows/catalog.md) |
| Lifecycle diagramy | [docs/workflows/lifecycle-diagrams.md](docs/workflows/lifecycle-diagrams.md) |
| Permission model | [docs/security/roles-permissions.md](docs/security/roles-permissions.md) |
| GDPR, retence, secrets | [docs/security/gdpr.md](docs/security/gdpr.md) |
| Reporting a KPI | [docs/product/reporting.md](docs/product/reporting.md) |
| Onboarding a šablony | [docs/templates/onboarding-and-templates.md](docs/templates/onboarding-and-templates.md) |
| Strukturu složek a scaffold | [docs/architecture/folder-structure.md](docs/architecture/folder-structure.md), [docs/architecture/scaffold-map.md](docs/architecture/scaffold-map.md) |
| Implementační strategii a stack | [docs/product/implementation-strategy.md](docs/product/implementation-strategy.md) |

## Rychlý start

Předpoklad: založený Supabase projekt (viz [supabase-setup.md](docs/integrations/supabase-setup.md)).

```bash
cp .env.example .env         # doplň SUPABASE_* a DATABASE_URL / DIRECT_URL
npm install
npm run db:migrate           # spustí db/migrations/0001_init.sql (tenancy, users, role, audit)
npm run db:seed              # workspace + owner účty + role (admin ownerům)
npm run dev                  # web (Next.js); worker (joby) přes `npm run worker`
```

Ověření: `GET /api/trpc/health` → `{ ok: true }`; přihlášení na `/login`; `me` vrátí roli a moduly.

## Stav implementace

- **Fáze 0 (skeleton) — hotovo v kódu:** Supabase DB klient (Drizzle), migrace 0001 (tenancy/users/role/audit),
  Supabase Auth (email+heslo + TOTP MFA) za `AuthProvider` portem, tRPC kostra (`health`, `me`) s tenant-contextem
  a RBAC, seed rolí. *Verifikace naživo čeká na váš Supabase projekt.*
- **Fáze 1 (MVP core) — další:** moduly organizations, contacts, deals+pipeline, projects+šablony, tasks, timeline.
- Plán fází: [implementation-strategy.md](docs/product/implementation-strategy.md).
