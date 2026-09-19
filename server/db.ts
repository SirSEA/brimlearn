import { EMAIL_LOGIN_METHOD } from "@shared/const";
import {
  Timestamp,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import type { User } from "@shared/user";
import { ENV } from "./_core/env";
import { getFirestoreDb } from "./_core/firebase";

const USERS_COLLECTION = "users";

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return new Date();
}

type StoredUser = {
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: User["role"];
  passwordHash?: string | null;
  passwordSalt?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastSignedIn?: Date;
};

function mapUser(doc: DocumentSnapshot): User | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    openId: doc.id,
    name: data.name ?? null,
    email: data.email ?? null,
    loginMethod: data.loginMethod ?? null,
    role: (data.role ?? "user") as User["role"],
    passwordHash: data.passwordHash ?? null,
    passwordSalt: data.passwordSalt ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastSignedIn: toDate(data.lastSignedIn),
  };
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb().collection(USERS_COLLECTION).doc(openId).get();
  return mapUser(doc);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const snap = await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snap.empty) return undefined;
  return mapUser(snap.docs[0]);
}

export async function doesEmailExist(email: string): Promise<boolean> {
  const existing = await findUserByEmail(email);
  return Boolean(existing);
}

export type UpsertUserInput = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: User["role"];
  passwordHash?: string | null;
  passwordSalt?: string | null;
  lastSignedIn?: Date;
  createdAt?: Date;
};

export async function upsertUser(user: UpsertUserInput): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  if (!ENV.firebaseConfigured) {
    console.warn("[Database] Firestore not configured; skipping upsert.");
    return;
  }

  const store: StoredUser = { updatedAt: new Date() };

  if (user.name !== undefined) store.name = user.name ?? null;
  if (user.email !== undefined) store.email = user.email ?? null;
  if (user.loginMethod !== undefined) store.loginMethod = user.loginMethod ?? null;
  if (user.role !== undefined) store.role = user.role;
  else if (user.openId === ENV.ownerOpenId) store.role = "admin";
  if (user.passwordHash !== undefined) store.passwordHash = user.passwordHash ?? null;
  if (user.passwordSalt !== undefined) store.passwordSalt = user.passwordSalt ?? null;
  if (user.createdAt !== undefined) store.createdAt = user.createdAt;
  store.lastSignedIn = user.lastSignedIn ?? new Date();

  await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(user.openId)
    .set(store, { merge: true });
}

export type CreateEmailUserInput = {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: NonNullable<User["role"]>;
};

export async function createEmailUser(input: CreateEmailUserInput): Promise<User> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first."
    );
  }

  const now = new Date();
  const store: StoredUser = {
    name: input.name,
    email: input.email,
    loginMethod: EMAIL_LOGIN_METHOD,
    role: input.role,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };

  const doc = getFirestoreDb().collection(USERS_COLLECTION).doc(input.openId);
  await doc.set(store);
  const created = await doc.get();
  const user = mapUser(created);
  if (!user) throw new Error("Failed to read back the created user");
  return user;
}

// TODO: add feature queries here as your schema grows.