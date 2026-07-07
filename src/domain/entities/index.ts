/**
 * Čisté doménové typy entit — bez Drizzle, bez zod, bez frameworku.
 * Slouží jako kontrakt mezi vrstvami (repository mapuje DB řádek → tento typ, service s ním pracuje).
 * Drizzle table definice (perzistence) jsou v src/modules/<name>/*.entity.ts a mapují se na tyto typy.
 */
export * from "./organization";
export * from "./deal";
export * from "./project";
export * from "./task";
