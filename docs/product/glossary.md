# Glosář — závazná terminologie

| Termín | Význam | Pozor na |
|---|---|---|
| **Workspace** | Tenant (organizace provozující CRM). Self-hosted = jeden. | Ne totéž co „klient". |
| **Organization (Klient)** | Firma, se kterou máme vztah — prospekt i klient. Rozlišuje `lifecycle_stage`. | Prospekt a klient je **jedna** entita. |
| **Contact** | Osoba u klienta. Nositel osobních údajů (GDPR pivot). | Role kontaktu = `ContactRole`, ne pole. |
| **Deal** | Obchodní příležitost v pipeline. | Po Won vzniká Projekt (draft). |
| **Project (Sub-karta)** | Dodávka pod klientem; klient jich má víc. Typ one-off / retainer. | Ne totéž co Deal. |
| **Task** | Univerzální pracovní jednotka: delivery / **support ticket** / sales follow-up / interní. | Ticket = `Task type=support`, ne nová entita. |
| **Ticket** | Hovorové označení pro `Task type=support` s SLA. | Není samostatná tabulka. |
| **Activity** | Plánovatelná/vykonaná lidská akce (call, meeting, email, note). | Editovatelná; ≠ TimelineEvent. |
| **TimelineEvent** | Imutabilní systémový záznam v agregované timeline. | Nezapisuje se ručně. |
| **Retainer** | Dlouhodobý projekt bez pevného konce, s recurring tasky. | `engagement_type=retainer`, fáze Ongoing. |
| **SLA tier** | Úroveň supportu klienta (Basic/Standard/Premium). | Řídí response/resolution časy. |
| **Reference dokument** | Odkaz na soubor v Drive/SharePoint + metadata. | CRM soubor nedrží (kromě opt-in nativního uploadu). |
| **Secret ref** | Odkaz na místo, kde leží přístupové údaje. | CRM **hodnotu** secretu neukládá nikdy. |
