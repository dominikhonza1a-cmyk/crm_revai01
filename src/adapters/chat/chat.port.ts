/** Port pro chat notifikace (odchozí). Generický webhook obslouží Slack/Teams/Discord. */
export interface ChatMessage {
  title: string;
  body?: string;
  link?: string;          // odkaz do CRM
  severity?: "critical" | "normal";
}

export interface ChatNotifier {
  postMessage(target: { channel?: string }, msg: ChatMessage): Promise<void>;
}
