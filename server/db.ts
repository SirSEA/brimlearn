import { EMAIL_LOGIN_METHOD } from "@shared/const";
import {
  Timestamp,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import type { User } from "@shared/user";
import type { CreateResourceInput, Resource, ResourceWithContent } from "@shared/resource";
import type { Scheme, SchemeWeek } from "@shared/scheme";
import type {
  CreateLiveSessionInput,
  LiveSession,
  UpdateLiveSessionInput,
} from "@shared/session";
import { ENV } from "./_core/env";
import { getFirestoreDb } from "./_core/firebase";

const USERS_COLLECTION = "users";
const RESOURCES_COLLECTION = "resources";
const LIVE_SESSIONS_COLLECTION = "liveSessions";
const SCHEMES_COLLECTION = "schemes";

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

/* ---------------------------------------------------------------------------
 * Resources (tutor-published videos & files shared with students).
 * File bytes are stored inline as base64 so the doc never exceeds Firestore's
 * 1 MiB limit; list endpoints omit the payload to keep responses small.
 * ------------------------------------------------------------------------- */

type StoredResource = {
  kind?: Resource["kind"];
  category?: Resource["category"];
  title?: string;
  description?: string;
  youtubeId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number;
  createdBy?: string;
  createdByName?: string | null;
  createdAt?: Date;
  grade?: string | null;
  subjectId?: string | null;
  subject?: string | null;
  term?: string | null;
  week?: string | null;
  dataBase64?: string | null;
};

function mapResource(includeContent: boolean, doc: DocumentSnapshot): ResourceWithContent | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    kind: (data.kind ?? "file") as Resource["kind"],
    category: (data.category ?? "material") as Resource["category"],
    title: String(data.title ?? "Untitled resource"),
    description: String(data.description ?? ""),
    youtubeId: typeof data.youtubeId === "string" ? data.youtubeId : null,
    fileName: typeof data.fileName === "string" ? data.fileName : null,
    mimeType: typeof data.mimeType === "string" ? data.mimeType : null,
    size: typeof data.size === "number" ? data.size : 0,
    createdBy: String(data.createdBy ?? ""),
    createdByName: typeof data.createdByName === "string" ? data.createdByName : null,
    grade: typeof data.grade === "string" ? data.grade : null,
    subjectId: typeof data.subjectId === "string" ? data.subjectId : null,
    subject: typeof data.subject === "string" ? data.subject : null,
    term: typeof data.term === "string" ? data.term : null,
    week: typeof data.week === "string" ? data.week : null,
    createdAt: toDate(data.createdAt).toISOString(),
    dataBase64:
      includeContent && typeof data.dataBase64 === "string" ? data.dataBase64 : null,
  };
}

export async function listResources(): Promise<Resource[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(RESOURCES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs
    .map((doc) => mapResource(false, doc))
    .filter((resource): resource is ResourceWithContent => Boolean(resource));
}

export async function getResource(id: string): Promise<ResourceWithContent | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb().collection(RESOURCES_COLLECTION).doc(id).get();
  return mapResource(true, doc);
}

export async function createResource(
  input: CreateResourceInput & { createdBy: string; createdByName: string | null }
): Promise<Resource> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first."
    );
  }

  const now = new Date();
  const store: StoredResource = {
    kind: input.kind,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    youtubeId: input.kind === "video" ? input.youtubeId ?? null : null,
    fileName: input.kind === "file" ? input.fileName ?? null : null,
    mimeType: input.kind === "file" ? input.mimeType ?? null : null,
    size:
      input.kind === "file" && input.dataBase64
        ? Math.floor((input.dataBase64.length * 3) / 4)
        : 0,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: now,
    grade: input.grade ?? null,
    subjectId: input.subjectId ?? null,
    subject: input.subject ?? null,
    term: input.term ?? null,
    week: input.week ?? null,
    dataBase64: input.kind === "file" ? input.dataBase64 ?? null : null,
  };

  const doc = getFirestoreDb().collection(RESOURCES_COLLECTION).doc(nanoid(18));
  await doc.set(store);
  const created = await doc.get();
  const resource = mapResource(true, created);
  if (!resource) throw new Error("Failed to read back the created resource");
  return resource;
}

export async function deleteResource(id: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb().collection(RESOURCES_COLLECTION).doc(id).delete();
}

/* ---------------------------------------------------------------------------
 * Live sessions (tutor-scheduled real-time classes).
 * Times are stored as ISO strings so JSON-safe serialisation keeps them exact.
 * ------------------------------------------------------------------------- */

type StoredLiveSession = {
  title?: string;
  description?: string;
  grade?: string | null;
  subjectId?: string | null;
  subject?: string | null;
  term?: string | null;
  week?: string | null;
  platform?: LiveSession["platform"];
  meetingUrl?: string | null;
  meetingId?: string | null;
  passcode?: string | null;
  startsAt?: string;
  endsAt?: string;
  hostBy?: string;
  hostName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function mapLiveSession(doc: DocumentSnapshot): LiveSession | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    title: String(data.title ?? "Untitled session"),
    description: String(data.description ?? ""),
    grade: typeof data.grade === "string" ? data.grade : null,
    subjectId: typeof data.subjectId === "string" ? data.subjectId : null,
    subject: typeof data.subject === "string" ? data.subject : null,
    term: typeof data.term === "string" ? data.term : null,
    week: typeof data.week === "string" ? data.week : null,
    platform: (data.platform ?? "other") as LiveSession["platform"],
    meetingUrl: typeof data.meetingUrl === "string" ? data.meetingUrl : null,
    meetingId: typeof data.meetingId === "string" ? data.meetingId : null,
    passcode: typeof data.passcode === "string" ? data.passcode : null,
    startsAt: String(data.startsAt ?? ""),
    endsAt: String(data.endsAt ?? ""),
    hostBy: String(data.hostBy ?? ""),
    hostName: typeof data.hostName === "string" ? data.hostName : null,
    createdAt: toDate(data.createdAt).toISOString(),
    updatedAt: toDate(data.updatedAt).toISOString(),
  };
}

export async function listLiveSessions(): Promise<LiveSession[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(LIVE_SESSIONS_COLLECTION)
    .orderBy("startsAt", "asc")
    .limit(100)
    .get();
  return snap.docs
    .map((doc) => mapLiveSession(doc))
    .filter((session): session is LiveSession => Boolean(session));
}

export async function getLiveSession(id: string): Promise<LiveSession | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb().collection(LIVE_SESSIONS_COLLECTION).doc(id).get();
  return mapLiveSession(doc);
}

export async function createLiveSession(
  input: CreateLiveSessionInput & { hostBy: string; hostName: string | null }
): Promise<LiveSession> {
  if (!ENV.firebaseConfigured) {
    throw new Error("Firestore is not configured. Set FIREBASE_* credentials in .env first.");
  }

  const now = new Date();
  const store: StoredLiveSession = {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    grade: input.grade ?? null,
    subjectId: input.subjectId ?? null,
    subject: input.subject ?? null,
    term: input.term ?? null,
    week: input.week ?? null,
    platform: input.platform,
    meetingUrl: input.meetingUrl ?? null,
    meetingId: input.meetingId ?? null,
    passcode: input.passcode ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    hostBy: input.hostBy,
    hostName: input.hostName,
    createdAt: now,
    updatedAt: now,
  };

  const doc = getFirestoreDb().collection(LIVE_SESSIONS_COLLECTION).doc(nanoid(18));
  await doc.set(store);
  const created = await doc.get();
  const session = mapLiveSession(created);
  if (!session) throw new Error("Failed to read back the created live session");
  return session;
}

export async function updateLiveSession(
  id: string,
  input: UpdateLiveSessionInput & { hostBy: string; hostName: string | null }
): Promise<LiveSession | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = getFirestoreDb().collection(LIVE_SESSIONS_COLLECTION).doc(id);
  const patch: StoredLiveSession = { updatedAt: new Date() };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.grade !== undefined) patch.grade = input.grade ?? null;
  if (input.subjectId !== undefined) patch.subjectId = input.subjectId ?? null;
  if (input.subject !== undefined) patch.subject = input.subject ?? null;
  if (input.term !== undefined) patch.term = input.term ?? null;
  if (input.week !== undefined) patch.week = input.week ?? null;
  if (input.platform !== undefined) patch.platform = input.platform;
  if (input.meetingUrl !== undefined) patch.meetingUrl = input.meetingUrl ?? null;
  if (input.meetingId !== undefined) patch.meetingId = input.meetingId ?? null;
  if (input.passcode !== undefined) patch.passcode = input.passcode ?? null;
  if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt;

  await doc.update(patch);
  return mapLiveSession(await doc.get());
}

export async function deleteLiveSession(id: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb().collection(LIVE_SESSIONS_COLLECTION).doc(id).delete();
}

/* ---------------------------------------------------------------------------
 * Schemes of work (NERDC weekly plans uploaded by admins).
 * `weeks` is stored as an array so Firestore keeps row order intact.
 * ------------------------------------------------------------------------- */

type StoredScheme = {
  grade?: string;
  subjectId?: string;
  subject?: string;
  term?: string;
  weeks?: SchemeWeek[];
  sourceFile?: string | null;
  currentWeek?: string | null;
  importedAt?: Date;
  updatedAt?: Date;
};

function mapScheme(doc: DocumentSnapshot): Scheme | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    grade: String(data.grade ?? ""),
    subjectId: String(data.subjectId ?? ""),
    subject: String(data.subject ?? ""),
    term: String(data.term ?? ""),
    weeks: Array.isArray(data.weeks) ? (data.weeks as SchemeWeek[]) : [],
    sourceFile: typeof data.sourceFile === "string" ? data.sourceFile : null,
    currentWeek: typeof data.currentWeek === "string" ? data.currentWeek : null,
    importedAt: toDate(data.importedAt).toISOString(),
    updatedAt: toDate(data.updatedAt).toISOString(),
  };
}

export async function listSchemes(): Promise<Scheme[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(SCHEMES_COLLECTION)
    .orderBy("importedAt", "desc")
    .limit(200)
    .get();
  return snap.docs
    .map((doc) => mapScheme(doc))
    .filter((scheme): scheme is Scheme => Boolean(scheme));
}

export async function getScheme(id: string): Promise<Scheme | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb().collection(SCHEMES_COLLECTION).doc(id).get();
  return mapScheme(doc);
}

export async function createSchemes(schemes: Scheme[]): Promise<Scheme[]> {
  if (!ENV.firebaseConfigured) {
    throw new Error("Firestore is not configured. Set FIREBASE_* credentials in .env first.");
  }

  const saved: Scheme[] = [];
  const col = getFirestoreDb().collection(SCHEMES_COLLECTION);
  const now = new Date();

  for (const scheme of schemes) {
    const doc = col.doc(nanoid(18));
    const store: StoredScheme = {
      grade: scheme.grade,
      subjectId: scheme.subjectId,
      subject: scheme.subject,
      term: scheme.term,
      weeks: scheme.weeks,
      sourceFile: scheme.sourceFile,
      currentWeek: scheme.weeks[0]?.week ?? null,
      importedAt: now,
      updatedAt: now,
    };
    await doc.set(store);
    const created = await doc.get();
    const mapped = mapScheme(created);
    if (mapped) saved.push(mapped);
  }

  return saved;
}

export async function updateSchemeCurrentWeek(
  id: string,
  currentWeek: string
): Promise<Scheme | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = getFirestoreDb().collection(SCHEMES_COLLECTION).doc(id);
  await doc.update({ currentWeek, updatedAt: new Date() });
  return mapScheme(await doc.get());
}

export async function deleteScheme(id: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb().collection(SCHEMES_COLLECTION).doc(id).delete();
}