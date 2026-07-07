/**
 * Logger s REDAKCÍ secretů — klíče token/secret/password/authorization/credential se nikdy nezaloguují.
 * Viz docs/security/secrets.md.
 */
const REDACT = /token|secret|password|authorization|credential|api[-_]?key/i;

function redact(obj: unknown): unknown {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = REDACT.test(k) ? "[redacted]" : redact(v);
  return out;
}

type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, msg: string, meta?: Record<string, unknown>): void {
  const line = { level, msg, ...(meta ? { meta: redact(meta) } : {}) };
  // ve fázi 0 nahradit strukturovaným loggerem (pino); zde stdout JSON
  (level === "error" ? console.error : console.log)(JSON.stringify(line));
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => log("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => log("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => log("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => log("error", m, meta),
};
