import type { UserRole } from "./const";

/**
 * User stored in the Firestore `users` collection. The document id IS the
 * `openId`, so `id` and `openId` always match.
 */
export type User = {
  id: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  /** scrypt hash of the password for email/password accounts. Null for OAuth-only users. */
  passwordHash: string | null;
  /** Hex salt used when hashing `passwordHash`. Null for OAuth-only users. */
  passwordSalt: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};