/**
 * Autentizace je vyřešena v:
 *  - src/api/context.ts     — ověří Supabase token, načte app_user + workspace + oprávnění do Contextu,
 *  - src/api/trpc.ts        — `protectedProcedure` odmítne request bez userId/workspace (UNAUTHORIZED)
 *                             a nastaví tenant-context (AsyncLocalStorage).
 *
 * Tento soubor je jen ukazatel — samostatný auth middleware není potřeba (řetěz je v procedurách).
 * Object-level guard: requirePermission() v permission.middleware.ts. Audit u mutací: audit.middleware.ts.
 */
export const AUTH_NOTE = "Auth enforced in protectedProcedure (trpc.ts) + createContext (context.ts).";
