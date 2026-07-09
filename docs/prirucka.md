# 📘 Příručka revai CRM

*Průvodce pro každodenní práci — psáno pro lidi, ne pro programátory. Stav: červenec 2026.*

CRM běží na **https://crm.automatizace-ai.cz**. Přihlašuješ se e-mailem a heslem
(nastavíš si ho v Nastavení → Heslo; doporučené MFA tamtéž). Všechna data jsou **společná** —
oba admini vidí totéž, ať se přihlásí odkudkoli.

---

## 1. Jak spolu moduly souvisí (velký obrázek)

```
LEAD → deal v OBCHODĚ (pipeline) → vyhráno 🏆 → PROJEKT (fáze dodávky) → ÚKOLY týmu
                                                      ↑
KLIENT (firma) drží všechno pohromadě: kontakty, dealy, projekty, dokumenty, timeline
```

- **Klient (Klienti)** = firma. Na jeho kartě je vše: kontakty, dealy, projekty, dokumenty a hlavně **timeline** — chronologie všeho, co se s klientem dělo (e-maily, schůzky, posuny dealů, commity…).
- **Deal (Obchod)** = obchodní příležitost. Žije v pipeline, dokud ji nevyhraješ/neprohraješ.
- **Projekt (Projekty)** = dodávka po vyhraném dealu (nebo retainer). Má fáze a úkoly.
- **Úkol (Úkoly)** = konkrétní práce. Speciální typ je **ticket** (podpora od klienta) — ten má SLA hlídání.

## 2. Obchod — pipeline

Šest fází: **Lead → Qualified → Discovery → Proposal → Negotiation → Won/Lost.**
Dealy taháš myší (kanban) nebo přepínáš na kartě.

**Co se stane samo:**
- **Won** → automaticky vznikne **projekt** ze šablony dle typu (chatbot/automatizace/custom AI) ve stavu *draft* — včetně fází a připravených úkolů. Projektový manažer ho zkontroluje a tlačítkem **„Potvrdit a aktivovat"** spustí.
- **Deal bez pohybu** (dle fáze, např. 14 dní v Proposal) → ranní upozornění „stale deal".
- Každý posun dealu se zapíše do timeline klienta.

## 3. Projekty — dodávka

Fáze: **Kickoff → Discovery → Build → Test/UAT → Deploy → Hypercare → Closed** (retainer má navíc *Ongoing*; projekt jde i pozastavit — *On-hold*).

- Fáze posouváš kliknutím na „stepper" na kartě projektu.
- **Git repo** (Přehled → Git repo, formát `owner/repo`): commity, PR a release z GitHubu se pak samy objevují v timeline projektu.
- Úkoly projektu vznikají ze šablony při Won; další přidáš tlačítkem.

## 4. Úkoly a tickety (SLA)

- **Úkol** — běžná práce, má prioritu, termín, přiřazenou osobu. Po termínu → upozornění.
- **Ticket** (typ *support*) — když se ozve klient s problémem. Automaticky se mu podle **SLA tieru klienta** spustí dvě měřidla: *první reakce* a *vyřešení*. Když se blíží konec → **varování**; když vyprší → **breach + eskalace** (admin dostane e-mail okamžitě).
- Stav „čeká na klienta" SLA měřidlo **pozastaví**.
- **Opakované úkoly** (retainery — např. měsíční review): nastavíš opakování, CRM generuje instance samo.

## 5. Timeline a aktivity

Timeline je **jediný zdroj pravdy** o historii klienta/projektu — píše se do ní automaticky:
posuny dealů, změny fází, SLA události, e-maily a schůzky (Google), git aktivita, poznámky.
Ručně přidáš poznámku/telefonát přes **aktivitu** (hotová aktivita se do timeline propíše).

## 6. Automatické e-maily — kdo, co, kdy

Odesílá se přes Resend z `info@automatizace-ai.cz`. Výchozí chování (každý si může
předěfinovat v **Nastavení → Notifikace**: Okamžitě / Denní souhrn / Vypnuto):

| Událost | Kdy dorazí | Komu |
|---|---|---|
| 🚨 SLA porušeno / varování | okamžitě | admini |
| 🏆 Vyhraný deal | okamžitě | admini |
| ⏰ Úkol po termínu | okamžitě | přiřazený |
| 📥 Přiřazený úkol | denní souhrn ~7:00 | přiřazený |
| 📊 Posun dealu, stale deal | denní souhrn ~7:00 | vlastník dealu / admini |

## 7. Google (Gmail + kalendář)

Každý si v **Nastavení → Google účet** připojí svůj (d.valter@…, j.rehberger@…). Pak každých ~5 minut:
- **E-maily** (posledních 48 h) a **schůzky** (14 dní dopředu) se párují na klienty a zapisují do jejich timeline.
- **Pravidla párování:** e-mail kontakta v CRM → jistota; jinak doména webu klienta. Proto: **u klientů vyplňujte web!**
- Newslettery/automaty (`noreply@`, `newsletter@`…) se ignorují; interní pošta mezi vámi dvěma taky. Víc firem v kopii → zapíše se každé z nich. Jen čtení — CRM nikdy nic neodesílá z vašich schránek.

## 8. Hledání, štítky, vlastní pole

- **⌘K / Ctrl+K** — bleskové hledání napříč vším (klienti, kontakty, dealy, projekty, úkoly).
- **Štítky** — barevné chipy na klientovi/projektu („VIP", „chatbot"…). Klik na „+ štítek".
- **Vlastní pole** — v Nastavení si nadefinuješ atributy (např. „IČO", „Smlouva do") pro klienty/dealy/projekty; vyplňují se na kartě.

## 9. Dokumenty

CRM ukládá **odkazy** na Drive/SharePoint + metadata (ne soubory samotné).
**Secrety (hesla, API klíče klientů) do CRM nikdy nepatří** — jen reference, kde jsou uložené (1Password apod.); DB to i technicky odmítne.

## 10. Nastavení — co kde je

| Sekce | K čemu |
|---|---|
| Můj účet + oprávnění | kdo jsem, co smím |
| Uživatelé a role | pozvat kolegu, měnit role, deaktivovat |
| Google účet | připojení Gmail/kalendáře + Synchronizovat teď |
| Vlastní pole | definice atributů |
| Notifikace | co mi chodí okamžitě/souhrnem/vůbec |
| Heslo | první nastavení i změna |
| MFA | dvoufaktor (authenticator) |
| API klíče | napojení Make/n8n (klíč se ukáže jen jednou!) |
| GDPR | export dat subjektu, výmaz, kandidáti retence |

## 11. Napojení zvenčí

- **REST API pro Make/n8n** — `/api/v1/…` s API klíčem; nejužitečnější: `POST /api/v1/tasks` s `type: "support"` = ticket z webového formuláře rovnou se SLA. Návod: `docs/integrations/rest-api.md`.
- **GitHub webhooky** — repo → Settings → Webhooks; commity/PR do timeline projektu. Návod: `docs/integrations/git.md`.
- **Slack** (volitelné) — až dodáte webhook URL, kritické notifikace půjdou i do kanálu.

## 12. GDPR v kostce

Nastavení → GDPR: **export** všech dat kontaktu (JSON), **výmaz** (anonymizace + úkol na smazání externích souborů + tombstone, ať se nevrátí ze zálohy), **kandidáti retence** (koho už smazat dle lhůt).

## 13. Kde co technicky běží (pro jistotu)

| Co | Kde |
|---|---|
| Aplikace | Netlify (deploy = git push do `main`) |
| Databáze + přihlašování | Supabase (EU) |
| Automatizace (SLA, digest, sync) | Netlify cron → `/api/jobs` (à 5 min / denně) |
| Odchozí e-maily | Resend |
| Kód | GitHub `crm_revai01` (privátní) |
