# Integrace — Email

**MVP scope:** odchozí notifikace + denní digest přes SMTP. Logování komunikace / obousměrný sync = fáze 3.

## Odchozí e-maily přes SendGrid (zvolené řešení)

Účet SendGrid existuje, odesílatel `info@automatizace-ai.cz` je ověřený. Nastavení:
1. SendGrid → **Settings → API Keys → Create API Key** → název `revai CRM`, oprávnění **Restricted Access**
   → zapnout jen **Mail Send** → Create → zkopírovat klíč (`SG.…` — zobrazí se jen jednou).
2. Env proměnné (lokálně v `.env` i v Netlify → Environment variables):
   ```
   EMAIL_PROVIDER=smtp
   SMTP_URL=smtps://apikey:SG.TVUJ_KLIC@smtp.sendgrid.net:465
   SMTP_FROM=revai CRM <info@automatizace-ai.cz>
   ```
   (uživatelské jméno je doslova `apikey`, heslo je API klíč; SMTP_URL označit v Netlify jako secret)
3. Netlify → **Trigger deploy**, aby se env propsaly.
4. Ověření: vyřeš/zmeškej úkol nebo vyhraj deal → e-mail dorazí na adresu uživatele v CRM.

## Adapter `EmailProvider` (`src/adapters/email/email.port.ts`)
```ts
interface EmailProvider {
  send(msg: OutboundEmail): Promise<{ messageId: string }>;
  fetchInbox?(since: Date): Promise<InboundEmail[]>;   // fáze 3
  watchMailbox?(cb): Promise<void>;                    // push (Gmail watch / Graph subscription)
}
```
Výchozí `EMAIL_PROVIDER`: `console` (dev) → `smtp` → `gmail`/`outlook`. Přepínač v `.env` a per-workspace v Integracích.

## Odchozí (reminders, digest, notifikace)
`notification.service` a `Reminder` job posílají přes `EmailProvider.send`. Šablony jsou React Email
(`src/shared/notifications/templates`).

## Příchozí / logování (fáze 3)
- OAuth per uživatel (`IntegrationConnection`, token jen jako `credential_ref`).
- Sync ukládá **metadata + snippet**, ne celé schránky (privacy). Spárování: `from/to` e-mail ↔ `Contact.email`,
  vlákno ↔ otevřený Deal/Project. Vytvoří `Activity(type=email)` + `TimelineEvent(email_received/sent)`.
- Nespárované → workspace „inbox" k ručnímu přiřazení.

## Scopes (minimalizace)
Gmail: `gmail.send` (MVP), `gmail.readonly` + `gmail.metadata` (sync). Outlook/Graph: `Mail.Send`, `Mail.Read`.
