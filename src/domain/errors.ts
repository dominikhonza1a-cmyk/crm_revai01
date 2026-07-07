/**
 * Doménové chyby — nezávislé na HTTP/tRPC. API vrstva je mapuje na status kódy.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class NotFound extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` (${id})` : ""} nenalezen.`);
  }
}

export class PermissionDenied extends DomainError {
  readonly code = "PERMISSION_DENIED";
  constructor(action: string, resource: string) {
    super(`Nedostatečné oprávnění: ${action} na ${resource}.`);
  }
}

export class InvalidTransition extends DomainError {
  readonly code = "INVALID_TRANSITION";
  constructor(from: string, to: string, kind = "stav") {
    super(`Nepovolený přechod ${kind}: ${from} → ${to}.`);
  }
}

export class ValidationFailed extends DomainError {
  readonly code = "VALIDATION_FAILED";
  constructor(message: string, public readonly issues?: unknown) {
    super(message);
  }
}

export class TenantIsolationViolation extends DomainError {
  readonly code = "TENANT_ISOLATION";
  constructor() {
    super("Dotaz překročil hranici workspace (tenant isolation).");
  }
}
