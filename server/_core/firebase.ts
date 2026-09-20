import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { ENV } from "./env";

let _app: App | undefined;
let _firestore: Firestore | undefined;

type ServiceAccount = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

/**
 * Normalizes a FIREBASE_PRIVATE_KEY value so it survives the many ways it gets
 * mangled when pasted into a host's env dashboard. Retries to gracefully handle:
 *  - the whole service-account JSON accidentally pasted as the key,
 *  - a JSON string literal (quoted, with \n escapes),
 *  - a single-line value with literal backslash-n escapes,
 *  - or an already-valid PEM with real newlines.
 */
export function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Whole service-account JSON object came through as the key.
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const key = parsed.private_key ?? parsed.privateKey;
      if (typeof key === "string" && key.includes("PRIVATE KEY")) return key;
    } catch {
      /* fall through */
    }
  }

  // Quoted JSON string literal (e.g. copied from the service-account JSON).
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch {
      /* fall through */
    }
  }

  // Single line with literal backslash-n escapes (unwrapped by dotenv/Render).
  if (trimmed.includes("\\n")) {
    return trimmed.replace(/\\n/g, "\n");
  }

  return trimmed;
}

function resolveServiceAccount(): ServiceAccount | undefined {
  if (ENV.firebaseServiceAccountPath) {
    const raw = readFileSync(ENV.firebaseServiceAccountPath, "utf8");
    return JSON.parse(raw) as ServiceAccount;
  }
  if (ENV.firebaseProjectId || ENV.firebaseClientEmail || ENV.firebasePrivateKey) {
    if (!ENV.firebaseClientEmail || !ENV.firebasePrivateKey) {
      throw new Error(
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required alongside FIREBASE_PROJECT_ID."
      );
    }
    return {
      projectId: ENV.firebaseProjectId || undefined,
      clientEmail: ENV.firebaseClientEmail,
      privateKey: normalizePrivateKey(ENV.firebasePrivateKey),
    };
  }
  return undefined;
}

function buildApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) {
    console.warn(
      "[Firebase] No service-account credentials in .env. Falling back to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`)."
    );
    return initializeApp({});
  }

  return initializeApp({
    credential: cert(serviceAccount),
    ...(serviceAccount.projectId ? { projectId: serviceAccount.projectId } : {}),
  });
}

export function getFirebaseApp(): App {
  if (!_app) _app = buildApp();
  return _app;
}

/** Lazily-created Cloud Firestore client. Writes go straight to the Firebase console. */
export function getFirestoreDb(): Firestore {
  if (!_firestore) _firestore = getFirestore(getFirebaseApp());
  return _firestore;
}