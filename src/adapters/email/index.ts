import nodemailer from "nodemailer";
import { loadConfig } from "@/config/app.config";
import { logger } from "@/shared/logger";
import type { EmailProvider } from "./email.port";

/** Dev adapter — jen zaloguje (nic neodesílá). */
const consoleAdapter: EmailProvider = {
  async send(msg) {
    logger.info("[email:console] send", { to: msg.to, subject: msg.subject });
    return { messageId: "console-" + msg.subject };
  },
};

/**
 * SMTP adapter (nodemailer). SMTP_URL např.:
 *  - Gmail/Workspace: smtps://uzivatel%40domena.cz:APP_HESLO@smtp.gmail.com:465
 *  - Seznam/jiný SMTP: smtps://user:pass@smtp.provider.cz:465
 * SMTP_FROM = hlavička odesílatele ("revai CRM <info@…>"), jinak se použije SMTP uživatel.
 */
function smtpAdapter(url: string, from?: string): EmailProvider {
  const transporter = nodemailer.createTransport(url);
  return {
    async send(msg) {
      const info = await transporter.sendMail({
        from, to: msg.to.join(", "), subject: msg.subject, html: msg.html, replyTo: msg.replyTo,
      });
      return { messageId: String(info.messageId ?? "") };
    },
  };
}

/** Factory dle EMAIL_PROVIDER. gmail/outlook API sync = fáze 3 (odchozí pošta jde přes SMTP). */
export function resolveEmailProvider(): EmailProvider {
  const cfg = loadConfig();
  switch (cfg.EMAIL_PROVIDER) {
    case "smtp":
      if (cfg.SMTP_URL) return smtpAdapter(cfg.SMTP_URL, cfg.SMTP_FROM);
      logger.warn("EMAIL_PROVIDER=smtp, ale chybí SMTP_URL — používám console adapter");
      return consoleAdapter;
    case "console":
    default:
      return consoleAdapter;
  }
}

export type { EmailProvider } from "./email.port";
