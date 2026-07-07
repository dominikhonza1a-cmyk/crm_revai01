/**
 * Object-level guard `requirePermission(module, level)` je definován v src/api/trpc.ts (jako t.middleware,
 * aby byl navázaný na tRPC Context). Zde jen re-export pro přehlednost (moduly ho importují odtud nebo z trpc).
 */
export { requirePermission } from "../trpc";
