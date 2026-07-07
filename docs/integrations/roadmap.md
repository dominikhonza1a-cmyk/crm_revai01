# Integrace — roadmapa

| Integrace | Fáze | Poznámka |
|---|---|---|
| Email odchozí (SMTP/Gmail) | **1** | Připomínky, notifikace, digest. |
| Chat webhook (Slack/Teams) | **1** | Odchozí kritické notifikace. |
| CSV import | **2** | Klienti, kontakty, dealy (viz [../migration](../migration/import-strategy.md)). |
| REST API + OpenAPI | **2–3** | Pro n8n/Make/Zapier. |
| Email obousměrný sync | **3** | Logování komunikace, párování na kontakty/dealy. |
| Kalendář (Google/Outlook) | **3** | Meetingy do timeline. |
| Git (GitHub/GitLab) | **3** | Commity/PR/release do timeline projektu. |
| Zapier / Make (nativní) | **3** | Přes REST + webhooky. |
| Slack/Teams app (interaktivní) | **3+** | Obousměrný, akce z chatu. |

Všechny integrace mají **port (interface) od začátku** v `src/adapters` — konkrétní adaptér je u fáze 3
placeholder, ale services na něj už mohou volat.
