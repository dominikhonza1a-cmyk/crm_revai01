import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/api/root";

/** Typovaný tRPC React klient. `import type` u AppRouter zajistí, že se do klienta nedostane server kód. */
export const trpc = createTRPCReact<AppRouter>();
