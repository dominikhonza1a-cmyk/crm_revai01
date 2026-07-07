# 1. Přehled architektury CRM

## Účel

Interní CRM pro AI automatizační agenturu. Jeden systém pro obchod (dealy), dodávku (projekty jako
sub-karty pod klientem), provoz (support tickety a SLA) a řízení vztahu (kontakty, timeline, dokumenty).
Primární uživatelé jsou interní tým: dnes 2 spolumajitelé, výhledově role sales / PM / dev / support / admin.

## MVP vs. Advanced

### MVP (fáze 1–2) — použitelné CRM pro denní práci

- **Klienti (Organization)** s lifecycle stavem prospekt → aktivní → bývalý, custom fields, tagy.
- **Kontakty** s rolemi vůči firmě/projektu (sponzor, technický kontakt, uživatel, billing…).
- **Deal pipeline** Lead → Qualified → Discovery → Proposal → Negotiation → Won/Lost (kanban + tabulka).
- **Projekty (sub-karty klienta)**, typ one-off / retainer, delivery lifecycle Kickoff → … → Closed / Ongoing.
- **Won deal → projekt v draftu** ze šablony (PM potvrdí).
- **Tasky** včetně support ticketů (jedna entita `Task` s `type`), recurring tasků pro retainery.
- **Agregovaná timeline** (obchod + delivery + support v jednom feedu).
- **Dokumenty jako reference** na Google Drive / SharePoint + metadata; nativní upload až později.
- **SLA**: support (tiery per klient), delivery (overdue eskalace), sales (stale deal reminder).
- **Permissions** (5 rolí, object-level + field-level na finance a PII), **audit log**.
- **Notifikace**: kritické okamžitě chat+email, běžné denní digest, per-user preference.
- **Integrace**: email (Gmail/Outlook — logování + připomínky), odchozí chat webhook (Slack/Teams).
- **CSV import** (klienti, kontakty, dealy) s mapováním a dry-run.
- **Automatizace**: won→projekt, overdue→eskalace, SLA breach risk, recurring tasky, email reminders, account review.
- **GDPR**: retenční kategorie, anonymizace, export subjektu, erasure kaskáda.

### Advanced (fáze 3+)

- Reporting dashboard s **přeskládatelnými widgety** a drill-down (v MVP jen 3 statické widgety).
- Obousměrný email sync, kalendář, Git (commity/PR do timeline), Zapier/Make přes REST/OpenAPI.
- Nativní upload dokumentů + nativní verzování; plný timesheet.
- SaaS hardening: signup, create-tenant flow, Postgres RLS, billing.
- Custom role (nad rámec 5 systémových), per-projekt členství pro přísné NDA.

## Designové principy

1. **Méně modulů, jasné entity.** Support ticket není nová entita, ale `Task` s `type=support`.
   Prospekt i klient je jedna `Organization`. Míň tabulek = míň UI = míň chyb.
2. **Stack-agnostické jádro.** `src/domain` (typy, doménová pravidla, policies) nezávisí na frameworku
   ani DB. Frameworky (Next.js, Drizzle, pg-boss) žijí na okrajích (`adapters`, `api`, `shared`).
3. **Self-hosted first, SaaS-ready.** `workspace_id` ve všech entitách od migrace 0001; přechod na SaaS
   je zapnutí signupu a (volitelně) RLS, ne přepis jádra.
4. **Bezpečnost by default.** Secrets nikdy jako obsah (jen reference), PII maskované pro dev roli,
   audit append-only, dokumenty primárně jako reference.
5. **Automatizace jako data.** Workflowy jsou deklarativní definice (trigger/conditions/actions),
   ne roztroušený kód — jdou zobrazit, logovat, později editovat v UI.
6. **Idempotence všude.** Won→projekt, SLA eskalace, recurrence i notifikace mají dedup klíče —
   opakovaný webhook/klik/tick nezpůsobí duplikát.

## Návrh jednoduchého UX

Hlavní navigace má **6 položek**: `Dashboard · Klienti · Obchod · Projekty · Úkoly · Nastavení`,
plus globální `Cmd+K` (fulltext přes entity) a tlačítko „+ Nový". Reporting není samostatná položka —
**dashboard JE reporting**.

- **Dashboard** = mřížka přeskládatelných widgetů (drag & resize, layout per-user). Horní řada = velké/detailní
  (Moje dnešní práce, Pipeline value by stage, SLA at risk), níže kompakty. Widget → drill-down do filtrovaného pohledu.
- **Klientská karta** = hlavička (health, tagy, owner, SLA tier) + taby: Overview · **Projekty (sub-karty)** ·
  Kontakty · Timeline · Dokumenty · Dealy.
- **Deal pipeline** = kanban (karta = klient, hodnota, dny ve fázi), drop na Won → dialog „Vytvořit projekt ze šablony?".
- **Projektová karta** = fáze-stepper + taby: Overview · Tasky (+ tickety s SLA countdownem) · Timeline · Dokumenty · Integrace · SLA.
- **Úkoly** = default „Moje práce" (dnes / týden / overdue), přepínače: všechny · ticket queue (dle SLA) · recurring kalendář.
- **Nastavení** = Users & Roles · Pipeline · Fáze & Šablony · Custom fields & Tagy · Integrace · Notifikace · Workflows · Import · GDPR · Audit log.

Detaily komponent viz [scaffold-map.md](../architecture/scaffold-map.md) a [reporting.md](reporting.md).
