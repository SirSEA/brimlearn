import { USER_ROLES } from "../shared/const";
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /**
   * Login identifier backing the session cookie. OAuth users carry the Manus
   * openId; email/password users get a generated `email_<nanoid>` so the same
   * session mechanism works for every entry. Unique per user.
   */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /**
   * Product role. `user` remains the default for OAuth first-logins until the
   * profile is completed; signup/login choose from the explicit roles.
   */
  role: mysqlEnum("role", USER_ROLES).default("user").notNull(),
  /** scrypt hash of the password for email/password accounts. Null for OAuth-only users. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Hex salt used when hashing `passwordHash`. Null for OAuth-only users. */
  passwordSalt: varchar("passwordSalt", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here