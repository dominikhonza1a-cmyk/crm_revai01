"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink } from "@trpc/client";
import superjson from "superjson";
import { createBrowserClient } from "@supabase/ssr";
import { trpc } from "./trpc";

/** Poskytuje tRPC + React Query. Ke každému požadavku připojí Supabase access token (z browser session). */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }));
  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        // Google endpointy (kalendář, sync) volají externí API a trvají déle —
        // posílají se MIMO batch, ať neblokují vykreslení dashboardu.
        splitLink({
          condition: (op) => op.path.startsWith("integrations.googleSyncNow") || op.path.startsWith("integrations.todayAgenda"),
          true: httpLink({
            url: "/api/trpc",
            transformer: superjson,
            async headers() {
              const { data: { session } } = await supabase.auth.getSession();
              return session ? { authorization: `Bearer ${session.access_token}` } : {};
            },
          }),
          false: httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
            async headers() {
              const { data: { session } } = await supabase.auth.getSession();
              return session ? { authorization: `Bearer ${session.access_token}` } : {};
            },
          }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
