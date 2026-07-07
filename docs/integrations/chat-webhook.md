# Integrace — Chat webhook (Slack / Teams)

**MVP scope:** jednoduchý **odchozí** webhook pro notifikace (eskalace, SLA, won deal). Plný Slack/Teams app
(interaktivní, obousměrný) = fáze 3.

## Adapter `ChatNotifier` (`src/adapters/chat/chat.port.ts`)
```ts
interface ChatNotifier {
  postMessage(target: { channel?: string }, msg: ChatMessage): Promise<void>;
}
```
`CHAT_PROVIDER`: `console` (dev) | `webhook`. `webhook` adapter je generický incoming webhook — funguje pro
**Slack i Teams i Discord** (liší se jen tvar payloadu, řeší formatter). URL v `CHAT_WEBHOOK_URL` /
per-workspace v `Integration.config`.

> **Předpoklad:** výchozí implementace cílí na Slack incoming webhook. Teams se zapne přepnutím formatteru —
> volba Slack vs. Teams zatím nebyla potvrzena.

## Co se posílá
Kritické kategorie (`sla_breach`, `sla_warning`, `deal_won`, `task_overdue`) — viz [../workflows/notifications.md](../workflows/notifications.md).
Zpráva obsahuje titulek, entitu, odkaz do CRM a (u SLA) zbývající čas.

## Bezpečnost
Webhook URL je secret → `Integration.config` ho drží jako referenci / šifrovaně, nikdy v logu.
Příchozí webhooky (fáze 3) ověřují podpis (`webhook-handler.ts`).
