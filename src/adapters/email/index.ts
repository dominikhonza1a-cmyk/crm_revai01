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
 * Factory dle EMAIL_PROVIDER. smtp/gmail/outlook se doplní ve fázi 1–3.
 * outlook.adapter je placeholder (interface od začátku).
 */
export function resolveEmailProvider(): EmailProvider {
  const { EMAIL_PROVIDER } = loadConfig();
  switch (EMAIL_PROVIDER) {
    case "console": return consoleAdapter;
    // case "smtp": return smtpAdapter();
    // case "gmail": return gmailAdapter();
    // case "outlook": return outlookAdapter();  // placeholder
    default: return consoleAdapter;
  }
}

export type { EmailProvider } from "./email.port";
