import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/api/root";
import { createContext } from "@/api/trpc";

/**
 * tRPC HTTP handler (Next.js App Router). Vytáhne Supabase access token z Authorization hlavičky
 * nebo z cookie a předá do createContext (ověření + načtení uživatele/workspace/oprávnění).
 */
function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/sb-access-token=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        accessToken: extractToken(req),
        requestId: crypto.randomUUID(),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      }),
  });

export { handler as GET, handler as POST };
