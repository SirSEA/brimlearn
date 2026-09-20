import { describe, expect, it } from "vitest";
import { normalizePrivateKey } from "./firebase";

const pemLines = [
  "-----BEGIN PRIVATE KEY-----",
  "MIIEvQIBADANBg...",
  "-----END PRIVATE KEY-----",
];
const realPem = pemLines.join("\n");
const jsonStoredPem = realPem + "\n";

describe("normalizePrivateKey", () => {
  it("decodes a JSON string literal copied from the service-account JSON", () => {
    const quoted = String.raw`"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"`;
    expect(normalizePrivateKey(quoted)).toBe(jsonStoredPem);
  });

  it("decodes a single-line value with literal \\n escapes", () => {
    const singleLine = String.raw`-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n`;
    expect(normalizePrivateKey(singleLine)).toBe(jsonStoredPem);
  });

  it("leaves an already-valid PEM untouched", () => {
    expect(normalizePrivateKey(realPem)).toBe(realPem);
  });

  it("recovers the key when the whole service-account JSON is pasted", () => {
    const wholeJson = JSON.stringify({
      type: "service_account",
      project_id: "brimlearn-app",
      client_email: "firebase-adminsdk@brimlearn-app.iam.gserviceaccount.com",
      private_key: realPem,
    });
    expect(normalizePrivateKey(wholeJson)).toBe(realPem);
  });

  it("handles missing or empty values gracefully", () => {
    expect(normalizePrivateKey(undefined)).toBeUndefined();
    expect(normalizePrivateKey("")).toBeUndefined();
    expect(normalizePrivateKey("   ")).toBeUndefined();
  });
});