/**
 * Port pro Git integraci (fáze 3). Commity/PR/release → TimelineEvent(git_push) na projekt.
 * github.adapter je placeholder; interface existuje od začátku, aby na něj services mohly volat.
 */
export interface GitEvent {
  repo: string;
  kind: "push" | "pull_request" | "release";
  title: string;
  url: string;
  author: string;
  occurredAt: string;
}

export interface GitPort {
  listRepos(): Promise<{ name: string; url: string }[]>;
  /** Ověří a znormalizuje příchozí webhook payload na GitEvent. */
  parseWebhook(payload: unknown, signature: string): Promise<GitEvent>;
}
