import { logger } from "./logger";
import type { DomainEvent, DomainEventType, EventHandler } from "@/domain/events";

/**
 * Typovaný in-process event bus.
 *
 * FÁZE 1 (nyní): publish() dispatchuje in-process registrovaným subscriberům (best-effort, chyba jednoho
 * handleru neshodí ostatní). Bez durable outboxu — vhodné pro backend bez workeru.
 * FÁZE 2: publish() zapíše event do transactional outboxu ve stejné transakci jako doménovou změnu;
 *          dispatcher worker ho vyzvedne po commitu (at-least-once + retry). Rozhraní se nezmění.
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEventType>(type: T, handler: EventHandler<T>): void;
  dispatch(event: DomainEvent): Promise<void>;
}

const handlers = new Map<DomainEventType, EventHandler[]>();

export const eventBus: EventBus = {
  async publish(event) {
    // FÁZE 2 → zápis do outboxu. Zatím rovnou dispatch.
    await this.dispatch(event);
  },
  subscribe(type, handler) {
    const list = handlers.get(type) ?? [];
    list.push(handler as unknown as EventHandler);
    handlers.set(type, list);
  },
  async dispatch(event) {
    for (const h of handlers.get(event.type) ?? []) {
      try {
        await h(event as never);
      } catch (err) {
        logger.error("event handler selhal", { type: event.type, err: String(err) });
      }
    }
  },
};
