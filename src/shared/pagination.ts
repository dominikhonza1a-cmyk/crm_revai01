/** Cursor-based stránkování (stabilní nad append-heavy tabulkami jako timeline). */
export interface PageParams {
  cursor?: string | null;   // opaque; typicky (occurred_at, id)
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const DEFAULT_PAGE_SIZE = 50;

export function clampLimit(limit?: number, max = 200): number {
  return Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), max);
}
