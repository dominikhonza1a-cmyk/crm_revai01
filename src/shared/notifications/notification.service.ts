import type { UserId } from "@/domain/ids";

/**
 * Doručování notifikací. Kritické → immediate (chat+email), běžné → daily_digest. Per-user preference.
 * Viz docs/workflows/notifications.md a config/notification-rules.json.
 */
export type NotificationCategory =
  | "sla_breach" | "sla_warning" | "deal_won" | "task_assigned" | "task_overdue"
  | "deal_stage" | "deal_stale" | "mention" | "import_finished" | "digest";

export interface NotifyInput {
  category: NotificationCategory;
  userIds: UserId[];
  entityRef?: { type: string; id: string };
  title: string;
  body?: string;
  /** ID zdrojové entity pro dedup klíč (user, category, source_id, den). */
  sourceId?: string;
}

export interface NotificationService {
  notify(input: NotifyInput): Promise<void>;
}

/**
 * Pro každého příjemce: načti NotificationPreference (fallback config default).
 * immediate → notification_outbox (dedup + rate-limit) → ChatNotifier/EmailProvider.
 * daily_digest → digest_queue → digest.job.
 * Nikdy neposílat autorovi akce.
 */
export const notifications: NotificationService = {
  async notify(_input) {
    throw new Error("notifications.notify: implementace fáze 2 (outbox + preference + adaptéry).");
  },
};
