# Activity vs. TimelineEvent

Obě entity existují záměrně a mají ostře oddělenou roli.

| | **Activity** | **TimelineEvent** |
|---|---|---|
| Co to je | Plánovatelná/vykonaná **lidská akce** (call, meeting, email, note, demo) | Imutabilní záznam „něco se stalo" pro čtení timeline |
| Vlastník | `owner_id`, `status (planned/done)`; lze editovat, přeplánovat, smazat | Nemá vlastníka ani status; má `actor` a `occurred_at`; needituje se |
| Kdo zapisuje | Uživatel (UI) nebo email sync | **Výhradně systém** — doménové eventy + projekce z Activity |
| Životní cyklus | Mutable, soft delete | Append-only; jediná mutace = GDPR scrub `payload`/`title` |
| Vztah | 1 Activity → 1 TimelineEvent při dokončení/zalogování | Odkazuje na zdroj přes `source_type/source_id`; přežije soft-delete zdroje |

## Pravidla
1. UI timeline čte **pouze** `timeline_event` — jeden dotaz, jedno řazení, žádný UNION přes 8 tabulek.
2. TimelineEvent nikdo nezapisuje ručně; vzniká jen v service vrstvě / workflow engine.
3. Nový zdroj událostí (Git, Zapier) = nový `event_type`, **žádná nová tabulka**.
4. Plánované (nevykonané) Activity se v timeline nezobrazují — jsou v sekci „Upcoming"
   (`activity WHERE status=planned`).

## Proč to takto
Kdyby timeline četla přímo z Activity/Deal/Task/Ticket/…, každé zobrazení by byl UNION přes mnoho tabulek
s různým řazením a stránkováním. `TimelineEvent` je **materializovaný, denormalizovaný feed**: rychlé čtení,
stabilní kontrakt pro UI, snadné rozšíření o nové zdroje.
