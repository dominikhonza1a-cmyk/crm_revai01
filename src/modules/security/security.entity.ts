import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { auditColumns } from "@/shared/db/columns";

/**
 * Identita a autorizace (migrace 0001).
 * Autentizaci (heslo, TOTP MFA, OAuth) drží Supabase v auth.users; my držíme PROFIL + RBAC.
 * app_user.auth_user_id → auth.users.id (Supabase). User se nikdy hard-deletuje (FK z auditu) — anonymizuje se.
 */

export const workspaces = pgTable("workspace", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  defaultTimezone: text("default_timezone").notNull().default("Europe/Prague"),
  defaultCurrency: text("default_currency").notNull().default("CZK"),
  settings: jsonb("settings").notNull().default({}),
  dataRegion: text("data_region"),
  ...auditColumns,
}, (t) => ({
  slugUnique: uniqueIndex("workspace_slug_uq").on(t.slug),
}));

export const appUsers = pgTable("app_user", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  authUserId: uuid("auth_user_id"),                 // → Supabase auth.users.id (napojení po prvním loginu)
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  status: text("status").notNull().default("invited"),  // invited | active | deactivated
  timezone: text("timezone").notNull().default("Europe/Prague"),
  locale: text("locale").notNull().default("cs"),
  avatarUrl: text("avatar_url"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
  ...auditColumns,
}, (t) => ({
  emailUnique: uniqueIndex("app_user_ws_email_uq").on(t.workspaceId, t.email),
  authIdx: index("app_user_auth_idx").on(t.authUserId),
}));

export const roles = pgTable("role", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  key: text("key").notNull(),                       // admin | sales | pm | dev | support | <custom>
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  permissions: jsonb("permissions").notNull().default({}),          // { module: level }
  fieldPolicies: jsonb("field_policies").notNull().default({}),     // { "deal.financials": "hidden" }
  exportPermissions: jsonb("export_permissions").notNull().default([]),
  ...auditColumns,
}, (t) => ({
  keyUnique: uniqueIndex("role_ws_key_uq").on(t.workspaceId, t.key),
}));

export const userRoles = pgTable("user_role", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => appUsers.id),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  ...auditColumns,
}, (t) => ({
  pairUnique: uniqueIndex("user_role_uq").on(t.userId, t.roleId),
}));

export const apiKeys = pgTable("api_key", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  hashedKey: text("hashed_key").notNull(),          // argon2/bcrypt hash — nikdy plaintext
  scopes: jsonb("scopes").notNull().default([]),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...auditColumns,
}, (t) => ({
  prefixIdx: index("api_key_prefix_idx").on(t.prefix),
}));
