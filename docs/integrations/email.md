# Integrace — Email

**MVP scope:** odchozí notifikace + denní digest přes SMTP. Logování komunikace / obousměrný sync = fáze 3.

## Odchozí e-maily přes Resend (zvolené řešení)

Účet Resend existuje, doména/odesílatel `info@automatizace-ai.cz` je ověřený. Resend má i SMTP relay,
takže funguje s naším SMTP adapterem beze změny kódu. Free tier: 3 000 e-mailů/měsíc (100/den) — dostatečné.

1. Resend → **API Keys → Create API Key** → název `revai CRM`, permission **Sending access**
   → Create → zkopírovat klíč (`re_…` — zobrazí se jen jednou).
2. Env proměnné (lokálně v `.env` i v Netlify → Environment variables):
   ```
   EMAIL_PROVIDER=smtp
   SMTP_URL=smtps://resend:re_TVUJ_KLIC@smtp.resend.com:465
   SMTP_FROM=revai CRM <info@automatizace-ai.cz>
   ```
   (uživatelské jméno je doslova `resend`, heslo je API klíč; SMTP_URL označit v Netlify jako secret)
3. Netlify → **Trigger deploy**, aby se env propsaly.
4. Ověření: vyřeš/zmeškej úkol nebo vyhraj deal → e-mail dorazí na adresu uživatele v CRM.

*(Alternativa SendGrid: SMTP_URL=smtps://apikey:SG.KLIC@smtp.sendgrid.net:465 — kdyby se někdy měnil provider.)*

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
