import "dotenv/config";
import { nanoid } from "nanoid";
import { EMAIL_LOGIN_METHOD } from "@shared/const";
import * as db from "./db";
import { hashPassword } from "./_core/password";

/**
 * Idempotent admin bootstrap. Creates the first password-based admin account
 * when none exists (or refreshes the password of an existing one). Configure
 * with:
 *   ADMIN_NAME   (default "BrimLearn Admin")
 *   ADMIN_EMAIL  (required, e.g. admin@brimlearn.com)
 *   ADMIN_PASSWORD (required, at least 8 characters)
 *
 * Requires Firestore credentials (see server/_core/env.ts).
 * Run: npm run db:seed
 */
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "BrimLearn Admin").trim();

  if (!email || !password) {
    console.error("[Seed] ADMIN_EMAIL and ADMIN_PASSWORD are required.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("[Seed] ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await db.findUserByEmail(email);

  const { salt, hash } = hashPassword(password);
  const openId = `${EMAIL_LOGIN_METHOD}_${nanoid(24)}`;

  if (existing) {
    console.log(`[Seed] Admin account already exists for ${email}. Updating password…`);
    await db.upsertUser({
      openId: existing.openId,
      name,
      email,
      loginMethod: EMAIL_LOGIN_METHOD,
      role: "admin",
      passwordHash: hash,
      passwordSalt: salt,
    });
  } else {
    console.log(`[Seed] Creating admin account for ${email}…`);
    await db.createEmailUser({
      openId,
      name,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role: "admin",
    });
  }

  console.log("[Seed] Done. You can now sign in at /admin/login.");
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("[Seed] Failed:", error);
  process.exit(1);
});