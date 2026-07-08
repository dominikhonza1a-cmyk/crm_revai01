import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import type { ChatNotifier, ChatMessage } from "./chat.port";

const consoleAdapter: ChatNotifier = {
  async postMessage(target, msg) {
    logger.info("[chat:console] post", { channel: target.channel, title: msg.title, body: msg.body, link: msg.link });
  },
};

/**
 * Generický incoming webhook (Slack formát `{text}` — funguje na free plánu, 1 z 10 povolených aplikací).
 * Teams/Discord = jiný formatter, doplní se podle potřeby.
 */
function webhookAdapter(url: string): ChatNotifier {
  return {
    async postMessage(_target, msg: ChatMessage) {
      const lines = [`*${msg.title}*`];
      if (msg.body) lines.push(msg.body);
      if (msg.link) lines.push(`<${msg.link}|Otevřít v CRM>`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: lines.join("\n") }),
      });
      if (!res.ok) throw new Error(`Chat webhook selhal: HTTP ${res.status}`);
    },
  };
}

export function resolveChatNotifier(): ChatNotifier {
  const cfg = loadConfig();
  if (cfg.CHAT_PROVIDER === "webhook" && cfg.CHAT_WEBHOOK_URL) return webhookAdapter(cfg.CHAT_WEBHOOK_URL);
  return consoleAdapter;
}

export type { ChatNotifier } from "./chat.port";
