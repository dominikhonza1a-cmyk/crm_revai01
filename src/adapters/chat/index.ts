import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import type { ChatNotifier } from "./chat.port";

const consoleAdapter: ChatNotifier = {
  async postMessage(target, msg) {
    logger.info("[chat:console] post", { channel: target.channel, title: msg.title });
  },
};

/**
 * Webhook adapter — POST na CHAT_WEBHOOK_URL. Formatter podle cíle (Slack blocks vs. Teams cards).
 * Předpoklad: default Slack incoming webhook; Teams zapneš přepnutím formatteru (volba nepotvrzena).
 */
function webhookAdapter(url: string): ChatNotifier {
  return {
    async postMessage(_target, msg) {
      void url; void msg;
      throw new Error("chat:webhook: implementace fáze 1 (fetch POST + Slack/Teams formatter).");
    },
  };
}

export function resolveChatNotifier(): ChatNotifier {
  const cfg = loadConfig();
  if (cfg.CHAT_PROVIDER === "webhook" && cfg.CHAT_WEBHOOK_URL) return webhookAdapter(cfg.CHAT_WEBHOOK_URL);
  return consoleAdapter;
}

export type { ChatNotifier } from "./chat.port";
