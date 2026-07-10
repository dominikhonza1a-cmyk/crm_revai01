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

- **Klient (Klienti)** = firma. Na jeho kartě je vše: kontakty, dealy, projekty, dokumenty a hlavně **timeline** — chronologie všeho, co se s klientem dělo (e-maily, schůzky, posuny dealů, commity…). Údaje upravíš tlačítkem **✎ Upravit**; deal upravíš kliknutím na jeho kartu v Obchodě; projekt a úkol založíš tlačítky **+ Nový** na příslušných stránkách.
- **Deal (Obchod)** = obchodní příležitost. Žije v pipeline, dokud ji nevyhraješ/neprohraješ.
- **Projekt (Projekty)** = dodávka po vyhraném dealu (nebo retainer). Má fáze a úkoly.
- **Úkol (Úkoly)** = konkrétní práce. Speciální typ je **ticket** (podpora od klienta) — ten má SLA hlídání.
- **Nápad (Nápady)** = volné poznámky mimo klienty — postřehy, odkazy, plány (kap. 9).

## 2. Dashboard — co vidíš po přihlášení

Úvodní přehled, všechny karty jsou proklikávací:
- **Dnes** — tvé dnešní schůzky (živě z tvého Google kalendáře) + úkoly do dneška a po termínu
- **Cashflow tento měsíc** — příjmy (platby projektů vč. retainerů) − výdaje (předplatná + jednorázové nákupy); graf **příjmy ↑ / výdaje ↓** po měsících
- **Moje práce** — počet úkolů přiřazených právě tobě (klik → Úkoly)
- **Win-rate** — poměr vyhraných/prohraných dealů 🏆
- **Po termínu** — úkoly po deadline
- **Pipeline value** — součet hodnot otevřených dealů (klik → Obchod)
- **Pipeline po fázích** — kolik dealů a peněz je v které fázi
- **Stav projektů** — donut aktivní/draft/pozastavené/uzavřené
- **Otevřené tickety** — podpora podle priority
- **Revenue / klient** — žebříček vyhraných dealů podle klientů

## 3. Obchod — pipeline

Šest fází: **Lead → Qualified → Discovery → Proposal → Negotiation → Won/Lost.**
Dealy taháš myší (kanban) nebo přepínáš na kartě.

**Co se stane samo:**
- **Won** → automaticky vznikne **projekt** ze šablony dle typu (chatbot/automatizace/custom AI) ve stavu *draft* — včetně fází a připravených úkolů. Projektový manažer ho zkontroluje a tlačítkem **„Potvrdit a aktivovat"** spustí.
- **Deal bez pohybu** → ranní upozornění „stale deal". Limity dle fáze: Lead a Qualified **14 dní**, Discovery **21 dní**, Proposal a Negotiation **10 dní**.
- Každý posun dealu se zapíše do timeline klienta.

## 4. Projekty — dodávka

Fáze: **Kickoff → Discovery → Build → Test/UAT → Deploy → Hypercare → Closed** (retainer má navíc *Ongoing*; projekt jde i pozastavit — *On-hold*).

- Fáze posouváš kliknutím na „stepper" na kartě projektu.
- **Git repo** (Přehled → Git repo, formát `owner/repo`): commity, PR a release z GitHubu se pak samy objevují v timeline projektu.
- Úkoly projektu vznikají ze šablony při Won; další přidáš tlačítkem.

## 5. Úkoly a tickety (SLA)

- **Úkol** — běžná práce, má prioritu, termín, přiřazenou osobu. Po termínu → upozornění.
- **Ticket** (typ *support*) — když se ozve klient s problémem. Automaticky se mu podle **SLA tieru klienta** spustí dvě měřidla: *první reakce* a *vyřešení*. Když se blíží konec → **varování**; když vyprší → **breach + eskalace** (admin dostane e-mail okamžitě).
- Stav „čeká na klienta" SLA měřidlo **pozastaví**.
- **Opakované úkoly** (retainery — např. měsíční review): nastavíš opakování, CRM generuje instance samo.

## 6. Timeline a aktivity

Timeline je **jediný zdroj pravdy** o historii klienta/projektu — píše se do ní automaticky:
posuny dealů, změny fází, SLA události, e-maily a schůzky (Google), git aktivita, poznámky.
Ručně přidáš poznámku/telefonát přes **aktivitu** (hotová aktivita se do timeline propíše).

## 7. Automatické e-maily — kdo, co, kdy

Odesílá se přes Resend z `info@automatizace-ai.cz`. Výchozí chování (každý si může
předěfinovat v **Nastavení → Notifikace**: Okamžitě / Denní souhrn / Vypnuto):

| Událost | Kdy dorazí | Komu |
|---|---|---|
| 🚨 SLA porušeno / varování | okamžitě | admini |
| 🏆 Vyhraný deal | okamžitě | admini |
| ⏰ Úkol po termínu | okamžitě | přiřazený |
| 📥 Přiřazený úkol | denní souhrn ~7:00 | přiřazený |
| 📊 Posun dealu, stale deal | denní souhrn ~7:00 | vlastník dealu / admini |

## 8. Google (Gmail + kalendář)

Každý si v **Nastavení → Google účet** připojí svůj (d.valter@…, j.rehberger@…). Pak každých ~5 minut:
- **E-maily** (posledních 48 h) a **schůzky** (14 dní dopředu) se párují na klienty a zapisují do jejich timeline.
- **Pravidla párování:** e-mail kontaktu v CRM → jistota; jinak doména webu klienta. Proto: **u klientů vyplňujte web!**
- Newslettery/automaty (`noreply@`, `newsletter@`…) se ignorují; interní pošta mezi vámi dvěma taky. Víc firem v kopii → zapíše se každé z nich. Jen čtení — CRM nikdy nic neodesílá z vašich schránek.
- **Pošta** (levé menu ✉️): historie spárovaných e-mailů napříč klienty, přepínač **Moje / Vše (oba)** — každý vidí svou schránku, nebo obě dohromady. Klik na řádek → karta klienta.

## 9. Nápady 💡

Sdílená nástěnka poznámek **mimo klienty** — postřehy, odkazy, plány, „co nás napadlo".
- **+ Nový nápad** → otevře se karta a prostě píšeš. Pole roste s textem donekonečna.
- **Autosave** — ukládá se samo ~1 s po posledním úhozu (vpravo nahoře „Uloženo ✓"). Na ukládání nemysli.
- **Přílohy a odkazy** — pod textem přidáš reference na dokumenty, weby, cokoli.
- **Štítky** — nápady si třiďte barevně („interní", „nový projekt"…).
- **Podstránky** — „+ Nová podstránka" založí stránku uvnitř nápadu (jako v Notionu), šipkou ← se vracíš na rodiče.
- Vše sdílené mezi vámi; ⌘K hledá i v obsahu nápadů.

## 10. Hledání, štítky, vlastní pole

- **⌘K / Ctrl+K** — bleskové hledání napříč vším (klienti, kontakty, dealy, projekty, úkoly, nápady).
- **Štítky** — barevné chipy na klientovi/projektu/nápadu („VIP", „chatbot"…). Klik na „+ štítek".
- **Vlastní pole** — v Nastavení si nadefinuješ atributy (např. „IČO", „Smlouva do") pro klienty/dealy/projekty; vyplňují se na kartě.

## 11. Dokumenty

CRM ukládá **odkazy** na Drive/SharePoint + metadata (ne soubory samotné).
**Secrety (hesla, API klíče klientů) do CRM nikdy nepatří** — jen reference, kde jsou uložené (1Password apod.); DB to i technicky odmítne.

## 12. Náklady a cashflow

- **Náklady** (levé menu 💳): předplatná (měsíční/roční) **i jednorázové výdaje** (s datem zaplacení). CZK přepočet dle ČNB.
- **Retainery se účtují samy**: 1. den měsíce přibude běžícím retainerům platba „retainer MM/RRRR" automaticky. Zapnutí/vypnutí = přepínač „Retainer běží" na projektu — zrušený retainer se přestane účtovat i počítat.
- Jednorázový příjem = přidáš platbu na projektu; jednorázový výdaj = přidáš náklad „jednorázově" s datem. Obojí se hned projeví v cashflow měsíce.

## 13. Nastavení — co kde je

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

## 14. Napojení zvenčí

- **REST API pro Make/n8n** — `/api/v1/…` s API klíčem; nejužitečnější: `POST /api/v1/tasks` s `type: "support"` = ticket z webového formuláře rovnou se SLA. Návod: `docs/integrations/rest-api.md`.
- **GitHub webhooky** — repo → Settings → Webhooks; commity/PR do timeline projektu. Návod: `docs/integrations/git.md`.
- **Slack** (volitelné) — až dodáte webhook URL, kritické notifikace půjdou i do kanálu.

## 15. GDPR v kostce

Nastavení → GDPR: **export** všech dat kontaktu (JSON), **výmaz** (anonymizace + úkol na smazání externích souborů + tombstone, ať se nevrátí ze zálohy), **kandidáti retence** (koho už smazat dle lhůt).

## 16. Kde co technicky běží (pro jistotu)

| Co | Kde |
|---|---|
| Aplikace | Netlify (deploy = git push do `main`) |
| Databáze + přihlašování | Supabase (EU) |
| Automatizace (SLA, digest, sync) | Netlify cron → `/api/jobs` (à 5 min / denně) |
| Odchozí e-maily | Resend (vč. auth e-mailů Supabase) |
| Kód | GitHub `crm_revai01` (privátní) |
