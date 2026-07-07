# Secrets a citlivé dokumenty

## Zásada: CRM neukládá hodnoty secretů. Nikdy.
Přístupové údaje ke klientským systémům (API klíče, hesla, tokeny n8n/Make, DB credentials) se do CRM
ukládají **jen jako reference**, ne jako obsah.

## Jak to vynucujeme na úrovni dat
- **Dokument typu secret**: `Document.kind = secret_ref` s poli `secret_location` (např.
  „1Password vault Acme / item n8n-prod") a `secret_policy_note`. **DB CHECK: `kind=secret_ref ⇒ external_url IS NULL`** —
  hodnota nemá kam zatéct.
- **Tokeny integrací**: `IntegrationConnection.credential_ref` je odkaz do šifrovaného úložiště / secret
  manageru (`SECRETS_BACKEND`), nikdy plaintext ve sloupci.
- **Import**: mapovací validace odmítne namapovat CSV sloupec na secret pole.
- **Field-level**: `document.secret_ref` vidí jen admin (write), pm (write), dev (read); sales/support none.

## Secret backend adapter
`SECRETS_BACKEND = env | vault | 1password`. Aplikace přes adapter jen **rozřeší referenci na použití za běhu**
(např. při odesílání emailu přes připojený účet), hodnotu nikdy neperzistuje ani neloguje.

## Citlivé dokumenty obecně
- `contains_pii = true` označuje dokumenty s osobními údaji → vstupují do GDPR erasure (delete reference +
  task na smazání v externím úložišti).
- Kategorie `contract`, `credentials_ref` mají v UI viditelný „citlivé" badge a omezený náhled.
- Náhledy/thumbnaily se u referencí negenerují (soubor žije v Drive/SharePoint pod jeho ACL).

## Provozní pravidla
- Secrets se nikdy nepíšou do logů (`logger` má redakci klíčů `token|secret|password|authorization`).
- Chybová hláška integrace (`last_error`) se sanitizuje před uložením.
