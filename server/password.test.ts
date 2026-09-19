import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";

describe("password hashing", () => {
  it("round-trips a password through hash + verify", () => {
    const { salt, hash } = hashPassword("correct horse battery staple");

    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
    expect(verifyPassword("correct horse battery staple", salt, hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const { salt, hash } = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", salt, hash)).toBe(false);
  });

  it("produces unique salts per hash", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it("is lenient against malformed stored values", () => {
    expect(verifyPassword("anything", null, null)).toBe(false);
    expect(verifyPassword("anything", "not-hex", "not-hex")).toBe(false);
    expect(verifyPassword("anything", "00".repeat(16), "00".repeat(64))).toBe(false);
  });
});