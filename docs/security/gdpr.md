# 7. GDPR a bezpečnost

Retenční lhůty jsou konfigurovatelné per workspace; níže jsou **seed defaulty** (předpoklad k revizi s právníkem).

## Retenční kategorie a lhůty

| Kategorie | Lhůta | Akce po uplynutí | Právní základ |
|---|---|---|---|
| Leady/kontakty bez konverze | 18 měs. od `last_activity_at` | anonymizace; hard delete pokud bez vazeb | oprávněný zájem |
| Klientská data (kontakty aktiv./bývalého klienta) | konec smlouvy + 4 roky | anonymizace kontaktů; Organization (ne-osobní) zůstává | plnění smlouvy |
| Komunikace (email, meeting notes, poznámky) | prospekt 18 měs.; klient konec smlouvy + 3 roky | purge `body`/`email_metadata` | oprávněný zájem |
| Dokumenty-reference | řídí externí úložiště | delete řádku Document při erasure | — |
| Audit logy | 3 roky; permission/exporty/GDPR 5 let | hard delete (partition drop) | oprávněný zájem / prokazatelnost |
| Zálohy | denně, rotace 35 dní | expirace; po restore re-apply erasure z tombstonů | — |

## Anonymizace vs. mazání
Default je **anonymizace in-place** (drží referenční integritu a statistiky):
`first_name/last_name → "Anonymized Contact"`, `email/phone/linkedin/notes → NULL`, custom `is_pii → NULL`,
`anonymized_at = now()`. Hard delete jen u kontaktů bez závislostí (neúspěšný import/duplicita).
**User se nikdy hard-deletuje** (FK z auditu) — anonymizuje se (`email → sha256`, jméno → „Deleted user").

## Právo na výmaz — kaskáda (`ErasureService`, jediné místo řešící polymorfii)
1. **Contact** — anonymizace polí (výše).
2. **`contact_role`** — hard delete řádků.
3. **`activity`** s kontaktem — purge `subject`, `body`, `email_metadata`; řádek zůstává jako „interakce proběhla".
4. **`timeline_event`** — scrub `title`/`payload` u eventů s PII (dohledání přes `source_id` + denorm `contact_id`).
5. **`tagging`, `reminder`** na kontakt — hard delete.
6. **`document`** s `contains_pii` na kontakt — delete reference + **vygeneruje task** „vymaž i v Drive/SharePoint"
   (CRM externí soubor smazat nemůže — udělá to člověk).
7. **`audit_log`** — záznamy zůstávají, `changes` diffy s PII se scrubnou; zapíše se `audit_log(gdpr_erasure)`.
8. **`erasure_tombstone`** (`subject_email_hash`, `contact_id`, `executed_at`) — po restore ze zálohy se
   erasure automaticky re-aplikuje. Bez tombstonu je každý restore GDPR díra.

## Export subjektu údajů
Endpoint „GDPR export kontaktu" → JSON bundle: contact vč. custom fields, contact_roles, activities
(metadata + těla), účast na dealech/projektech (názvy, role), consent historie, tagy. Auditováno `gdpr_export`.

## Privacy by default
1. Sbírají se jen pracovní B2B údaje — **žádné pole typu datum narození** ve vestavěném schématu.
2. `is_pii` je **povinná volba** při zakládání custom field.
3. Dev role vidí PII **maskovaně** už od seedu.
4. Retenční job běží nočně, ale **nemaže automaticky** — plní „Retention review" frontu, admin schválí dávku
   (pojistka proti chybné konfiguraci).
5. Secrets nikdy v DB — jen `credential_ref` / `secret_location` (viz [secrets.md](secrets.md)).
6. Emailová integrace ukládá metadata + snippet, ne celé schránky.
7. Self-hosted EU hosting, šifrování disku, TLS.

## Přístup export / deletion / archive
- **Export** — jen role s `export.*` permission, vždy auditováno.
- **Deletion (erasure)** — jen admin, přes `ErasureService`, vždy auditováno.
- **Archive** — soft delete (`deleted_at`); záznam zmizí z pohledů, zůstává pro reporting/audit do uplynutí retence.
