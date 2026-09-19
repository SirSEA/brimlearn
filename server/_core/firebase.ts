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
      privateKey: ENV.firebasePrivateKey,
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