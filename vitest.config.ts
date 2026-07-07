import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Mapuje TS path aliasy pro Vitest (pořadí: specifické před obecným). */
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/config\/(.*)$/, replacement: r("./config/$1") },
      { find: /^@\/shared$/, replacement: r("./src/shared/index.ts") },
      { find: /^@\/(.*)$/, replacement: r("./src/$1") },
    ],
  },
  test: {
    include: ["tests/**/*.{test,spec}.ts"],
  },
});
