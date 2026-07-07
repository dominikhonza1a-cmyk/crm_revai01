/** Port pro email. Services závisí JEN na tomto interface, ne na konkrétním provideru. */
export interface OutboundEmail {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface InboundEmail {
  messageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;         // NE celé tělo — privacy (viz docs/security/gdpr.md)
  receivedAt: string;
}

export interface EmailProvider {
  send(msg: OutboundEmail): Promise<{ messageId: string }>;
  fetchInbox?(since: Date): Promise<InboundEmail[]>;   // fáze 3
  watchMailbox?(cb: (e: InboundEmail) => Promise<void>): Promise<void>; // fáze 3 (push)
}
