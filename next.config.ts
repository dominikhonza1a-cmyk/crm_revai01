import type { NextConfig } from "next";

/** Next.js App Router. UI + tRPC + REST fasáda + webhooky běží ve web procesu; joby ve worker.ts. */
const config: NextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  // i18n: čeština je výchozí jazyk UI (kód anglicky).
};

export default config;
