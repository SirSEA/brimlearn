import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function normalizeOutput(value: unknown): Buffer | null {
  if (typeof value !== "string") return null;
  try {
    return Buffer.from(value, "hex");
  } catch {
    return null;
  }
}

/**
 * Derive a salted scrypt hash for a plaintext password. Returns hex values that
 * are safe to persist in the `passwordHash` / `passwordSalt` columns.
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const saltBytes = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, saltBytes, KEY_LENGTH).toString("hex");
  return { salt: saltBytes.toString("hex"), hash };
}

/**
 * Constant-time verification of a plaintext password against a stored hash.
 * Returns false (never throws) when the stored hash is malformed or absent.
 */
export function verifyPassword(
  password: string,
  salt: string | null | undefined,
  expectedHash: string | null | undefined
): boolean {
  const saltBuffer = normalizeOutput(salt);
  const expected = normalizeOutput(expectedHash);
  if (!saltBuffer || !expected || expected.length !== KEY_LENGTH) return false;

  const actual = scryptSync(password, saltBuffer, KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}