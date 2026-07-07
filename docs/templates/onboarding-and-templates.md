# 9. Onboarding a šablony

Strojově čitelné šablony jsou v [../../db/seeds/templates](../../db/seeds/templates). Tento dokument popisuje jejich obsah a checklisty.

## Default pipeline template (sales)
`Lead (14 d) → Qualified (14 d) → Discovery (21 d) → Proposal (10 d) → Negotiation (10 d) → Won → Lost`.
Čísla v závorce = `stale_after_days` (vstup pro stale-deal reminder W8). Won/Lost jsou terminální, Lost vyžaduje `lost_reason`.

## Project templates
Struktura: `{ key, name, project_type, engagement_type, phases[], tasks[] }`. Fáze i tasky se při Won→projekt
**kopírují** (snapshot). Tasky mají `phase_key`, `offset_days`, `default_assignee_role`, volitelně `recurrence_rule`.

### chatbot-delivery (one_off)
Kickoff (úvodní call, sběr přístupů: KB/web/kanály) → Discovery (audit znalostní báze, mapa konverzačních
scénářů) → Build (prompt/agent design, integrace kanálu, testovací sada otázek) → Test/UAT (UAT s klientem,
ladění odpovědí) → Deploy (go-live, monitoring) → Hypercare (dohled) → Handover (dokumentace, zaškolení, nabídka retaineru).

### automation-delivery (one_off)
Kickoff (procesní workshop) → Discovery (procesní mapa, přístupy k systémům) → Build (n8n/Make scénáře,
error handling, credentials jako reference) → Test/UAT (paralelní běh se starým procesem) → Deploy (přepnutí, alerting)
→ Hypercare → Handover (runbook, školení).

### custom-ai-development (one_off)
Kickoff → Discovery (datový audit, feasibility) → Build (milníky M1 prototyp / M2 eval sada / M3 integrace) →
Test/UAT (eval report, UAT) → Deploy → Hypercare → Handover (zdrojáky, provozní dokumentace, přístup do Gitu).

### retainer-care (retainer, SLA Standard)
Kickoff (nastavení SLA a kanálů) → Ongoing s recurring tasky: `Account review` (měsíčně, W6),
`Usage & cost report` (měsíčně), `Backlog grooming` (2 týdny), `Roadmap call` (kvartálně).

## Onboarding checklist (nový klient → aktivní)
1. Založit Organization (lifecycle=active_client), přiřadit owner PM a `support_sla_policy` (tier).
2. Přidat klíčové kontakty s rolemi (sponsor, technical_contact, billing_contact).
3. Vytvořit sdílenou složku v Drive/SharePoint, přilinkovat jako Document (kind=external_ref).
4. Uložit přístupy jako `secret_ref` (odkaz do 1Password/Vault) — nikdy hodnoty.
5. Potvrdit projekt z draftu (tým, termíny, budget/retainer fee).
6. Kickoff meeting → zápis jako Activity + Document (zápis).

## Handoff checklist (delivery → hypercare/retainer)
1. Předávací dokumentace (Handover) přilinkována.
2. Zaškolení klienta zaznamenáno (Activity).
3. Nastaven support SLA tier a kanál.
4. Monitoring/alerting aktivní (u automation/custom AI).
5. Otevřené známé issues převedeny na support tickety.
6. Nabídnut retainer (nový deal nebo retainer projekt).

## Support runbook template
- **Příjem:** ticket = `Task type=support` (kanál email/chat/portal), auto SLATrackery dle tier klienta.
- **Triage:** priorita P1–P4 (P1 = výpadek produkčního řešení), assignee = dev/support.
- **Komunikace:** první odchozí reakce plní `first_response`; `waiting_on_client` pauzuje SLA.
- **Řešení:** `status=done` plní `resolution`; zápis řešení do popisu; opakující se problém → task na trvalý fix v projektu.
- **Eskalace:** dle `escalation_rules` (75 % → assignee, 100 % → assignee+PM, +2 h → admini).
- **Postmortem (P1):** krátký zápis jako Document na projekt.
