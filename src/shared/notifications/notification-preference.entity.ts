/**
 * Drizzle table pro NotificationPreference (per-user × kategorie × kanál → režim).
 * Default seed: kritické (sla_breach) immediate chat+email, zbytek daily_digest.
 * unique (user_id, event_category, channel). Viz config/notification-rules.json.
 */
export const NOTIFICATION_PREFERENCE_ENTITY_NOTE =
  "NotificationPreference: user × event_category × channel → mode(immediate|daily_digest|off), digest_hour.";
