# Integrace — Email (Gmail / Outlook)

**MVP scope:** odchozí připomínky/notifikace vždy (SMTP/Gmail API); logování komunikace ke klientovi/dealu.
Plný obousměrný sync schránky = fáze 3.

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
