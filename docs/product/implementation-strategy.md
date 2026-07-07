# 13. Implementační strategie

## Stack-agnostické jádro
`src/domain` (typy, enums, events, policies) nezná framework ani DB. To umožňuje vyměnit UI/DB/frontu bez
přepisu obchodní logiky a drží scaffold použitelný, i kdyby padla volba stacku jinak.

## Varianty implementace

### A) TypeScript monolit — Next.js + tRPC + Drizzle + PostgreSQL + pg-boss  ✅ DOPORUČENO
**Plusy:** jeden jazyk/repo/Docker image → minimální provoz (kritické pro 2 lidi); end-to-end typová bezpečnost
(tRPC + zod + Drizzle); **jediná infra závislost = PostgreSQL** (fronty, cron, outbox přes pg-boss — žádný Redis);
skvělý fit do TS světa (AI SDK, n8n, Make); self-hosted = `docker compose up`, SaaS-ready přes `workspace_id`.
**Mínusy:** dlouhoběžící joby vyžadují druhý proces (`worker.ts` ze stejného image); monolit vyžaduje disciplínu
ve vrstvení (řešeno `domain` + `modules`).
**Kdy:** malý tým, chce vlastnit doménovou logiku a jednoduchý provoz. → **tento případ.**

### B) NestJS API + React SPA (Vite)
**Plusy:** čistá modularita s DI, přirozené oddělení API/worker, snadné budoucí rozdělení na služby.
**Mínusy:** dvě aplikace (build, deploy, CORS, auth handshake), víc boilerplate, pomalejší iterace.
**Kdy:** tým 5+, veřejné API jako produkt, více klientů (mobil + web).

### C) Supabase + React (BaaS)
**Plusy:** nejrychlejší start (auth, storage, realtime, RLS zdarma), málo backend kódu.
**Mínusy:** business logika se rozpustí mezi RLS policies, DB triggery a edge funkce → workflow engine a audit
se dělají špatně; self-hosted Supabase je provozně těžší (desítky kontejnerů) než jeden Node monolit; hůř se
drží stack-agnostické jádro.
**Kdy:** MVP na ověření nápadu bez ambice vlastnit automatizační engine, čistě CRUD.

## Proč A
(1) Provozní plocha = 1 image + 1 Postgres. (2) Workflow/SLA/notifikační logika je **srdce produktu** a patří
do vlastního typovaného kódu, ne do RLS a edge funkcí. (3) tRPC dává interní rychlost, REST fasáda (`/api/v1`)
obsluhuje n8n/Make/Zapier. (4) Přechod na SaaS = zapnout signup + (volitelně) RLS nad existujícím `workspace_id`.

Doporučené knihovny: Next.js (App Router), tRPC v11, Drizzle ORM, zod, pg-boss, Better Auth (org/tenant plugin),
TanStack Query/Table, dnd-kit (kanban + widget grid), React Email + Nodemailer/Gmail API, Tailwind + shadcn/ui.

## Workflow engine (jednoduchý, přiměřený týmu)
DB-driven: **transactional outbox + pg-boss** (event bus + cron + retry nad PostgreSQL). Žádný Temporal/Kafka —
při desítkách eventů/den by byla těžká infra provozním rizikem. Detail: [../workflows/engine.md](../workflows/engine.md).

## Pořadí implementace

| Fáze | Obsah | Výstup |
|---|---|---|
| **0 — skeleton** (týden 1) | repo scaffold, Docker, Drizzle + migrace, Better Auth + tenant-context, tRPC skeleton, CI (typecheck+test), seed runner | Nasaditelný prázdný skelet |
| **1 — MVP core** (2–4 týdny) | organizations, contacts, deals + kanban, projects + instanciace šablon, tasks (bez recurrence), activities auto-log, security (role, permission middleware, audit), settings minimal, kompletní seed | Použitelné CRM pro oba majitele |
| **2 — automatizace** (3–4 týdny) | event bus + outbox + pg-boss, workflow engine + 6 definic, notifications (chat+email+digest+preference), recurring tasky + tickety se SLA, documents (reference + upload + verze), custom fields + tagy, CSV import | Automatizace, SLA, dokumenty, import |
| **3 — rozšíření + SaaS-ready** | reporting dashboard s drill-down, Gmail/Outlook sync, REST/OpenAPI, GDPR tooling (retention, export, erasure), kalendář/Git adaptéry, SaaS hardening (signup, create-tenant, RLS, billing) | Zralý produkt, volitelně SaaS |

## Ve scaffoldu záměrně jen placeholder (interface bez implementace)
`outlook.adapter`, `sharepoint-link.adapter`, `github.adapter`, `google-calendar.adapter`, Zapier fasáda,
drill-down reporting queries, nativní upload/verzování, `erasure.service` plná kaskáda, billing. Interface
existují od prvního dne, aby services nikdy nezávisely na konkrétním provideru.
