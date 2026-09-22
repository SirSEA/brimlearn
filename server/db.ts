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
import type {
  Assignment,
  AssignmentAudience,
  AssignmentDifficulty,
  AssignmentStatus,
  AssignmentType,
  AssessmentQuestion,
  CreateAssignmentInput,
} from "@shared/assignment";
import type { LandingContent, SiteContentDoc, SiteContentStatus } from "@shared/site";
import { defaultLandingContent, SITE_CONTENT_DOC_ID } from "@shared/site";
import { ENV } from "./_core/env";
import { getFirestoreDb } from "./_core/firebase";

const USERS_COLLECTION = "users";
const RESOURCES_COLLECTION = "resources";
const LIVE_SESSIONS_COLLECTION = "liveSessions";
const SCHEMES_COLLECTION = "schemes";
const ASSIGNMENTS_COLLECTION = "assignments";
const SITE_CONTENT_COLLECTION = "siteContent";
const PASSWORD_RESETS_COLLECTION = "passwordResets";

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
  input: CreateLiveSessionInput & { hostBy: string; hostName: string | null },
  id?: string
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

  const doc = getFirestoreDb().collection(LIVE_SESSIONS_COLLECTION).doc(id ?? nanoid(18));
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

/* ---------------------------------------------------------------------------
 * Assignments (tutor-created work that lands on learner trackers).
 * ------------------------------------------------------------------------- */

type StoredAssignment = {
  type?: AssignmentType;
  title?: string;
  subject?: string;
  audience?: string;
  audienceKey?: AssignmentAudience;
  learnerIds?: string[];
  difficulty?: AssignmentDifficulty;
  due?: string | null;
  createdBy?: string;
  createdByName?: string | null;
  createdAt?: Date;
  status?: AssignmentStatus;
  questions?: AssessmentQuestion[];
};

function mapAssignment(doc: DocumentSnapshot): Assignment | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    type: (data.type ?? "Practice") as AssignmentType,
    title: String(data.title ?? "Untitled assignment"),
    subject: String(data.subject ?? ""),
    audience: String(data.audience ?? "Whole class"),
    audienceKey: (data.audienceKey ?? "class") as AssignmentAudience,
    learnerIds: Array.isArray(data.learnerIds)
      ? data.learnerIds.map((item: unknown) => String(item))
      : [],
    difficulty: (data.difficulty ?? "Medium") as AssignmentDifficulty,
    due: typeof data.due === "string" && data.due.length > 0 ? data.due : null,
    createdBy: String(data.createdBy ?? ""),
    createdByName: typeof data.createdByName === "string" ? data.createdByName : null,
    createdAt: toDate(data.createdAt).toISOString(),
    status: (data.status ?? "Scheduled") as AssignmentStatus,
    questions: Array.isArray(data.questions) ? (data.questions as AssessmentQuestion[]) : [],
  };
}

export async function listAssignments(): Promise<Assignment[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(ASSIGNMENTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs
    .map((doc) => mapAssignment(doc))
    .filter((assignment): assignment is Assignment => Boolean(assignment));
}

export async function createAssignment(
  input: CreateAssignmentInput & { createdBy: string; createdByName: string | null }
): Promise<Assignment> {
  if (!ENV.firebaseConfigured) {
    throw new Error("Firestore is not configured. Set FIREBASE_* credentials in .env first.");
  }

  const now = new Date();
  const store: StoredAssignment = {
    type: input.type,
    title: input.title.trim(),
    subject: input.subject.trim(),
    audience: input.audience.trim(),
    audienceKey: input.audienceKey,
    learnerIds: input.learnerIds ?? [],
    difficulty: input.difficulty,
    due: input.due && input.due.trim().length > 0 ? input.due.trim() : null,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: now,
    status: "Scheduled",
    questions: input.questions ?? [],
  };

  const doc = getFirestoreDb().collection(ASSIGNMENTS_COLLECTION).doc(nanoid(18));
  await doc.set(store);
  const created = await doc.get();
  const assignment = mapAssignment(created);
  if (!assignment) throw new Error("Failed to read back the created assignment");
  return assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb().collection(ASSIGNMENTS_COLLECTION).doc(id).delete();
}

/* ---------------------------------------------------------------------------
 * Site content (public landing page, editable by admins).
 * A single doc holds the working draft (`content`), a snapshot of the previous
 * published version (`previous`) for one-click revert, and publish metadata.
 * ------------------------------------------------------------------------- */

type StoredSiteContent = {
  status?: SiteContentStatus;
  content?: LandingContent;
  previous?: LandingContent | null;
  version?: number;
  updatedAt?: Date;
  publishedAt?: Date | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
};

function mapSiteContent(doc: DocumentSnapshot): SiteContentDoc | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    status: (data.status ?? "draft") as SiteContentStatus,
    content: (data.content as LandingContent | undefined) ?? defaultLandingContent(),
    previous: (data.previous as LandingContent | null | undefined) ?? null,
    version: typeof data.version === "number" ? data.version : 1,
    updatedAt: toDate(data.updatedAt).toISOString(),
    publishedAt: data.publishedAt ? toDate(data.publishedAt).toISOString() : null,
    updatedByName: typeof data.updatedByName === "string" ? data.updatedByName : null,
  };
}

/** Returns the landing site content, creating the default seed doc on first read. */
export async function getSiteContent(): Promise<SiteContentDoc> {
  if (!ENV.firebaseConfigured) {
    return { ...defaultsFrom(SITE_CONTENT_DOC_ID), id: SITE_CONTENT_DOC_ID };
  }
  const col = getFirestoreDb().collection(SITE_CONTENT_COLLECTION);
  const doc = col.doc(SITE_CONTENT_DOC_ID);
  const snap = await doc.get();
  if (!snap.exists) {
    const now = new Date();
    const store: StoredSiteContent = {
      status: "published",
      content: defaultLandingContent(),
      previous: null,
      version: 1,
      updatedAt: now,
      publishedAt: now,
      updatedByName: null,
    };
    await doc.set(store);
    return { ...store, id: SITE_CONTENT_DOC_ID, publishedAt: now.toISOString(), updatedAt: now.toISOString() } as SiteContentDoc;
  }
  return mapSiteContent(snap) ?? { ...defaultsFrom(doc.id), id: doc.id } as SiteContentDoc;
}

function defaultsFrom(id: string): Omit<SiteContentDoc, "id"> {
  const now = new Date().toISOString();
  return {
    status: "published",
    content: defaultLandingContent(),
    previous: null,
    version: 1,
    updatedAt: now,
    publishedAt: now,
    updatedByName: null,
  };
}

export async function updateSiteContent(
  content: LandingContent,
  byName: string | null
): Promise<SiteContentDoc> {
  if (!ENV.firebaseConfigured) {
    return {
      ...defaultsFrom(SITE_CONTENT_DOC_ID),
      id: SITE_CONTENT_DOC_ID,
      status: "draft",
      content,
      updatedByName: byName,
    };
  }
  const doc = getFirestoreDb().collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC_ID);
  await doc.set(
    {
      status: "draft",
      content,
      updatedAt: new Date(),
      updatedByName: byName,
    } satisfies StoredSiteContent,
    { merge: true }
  );
  const updated = await doc.get();
  return mapSiteContent(updated) ?? ({ ...defaultsFrom(doc.id), id: doc.id, content } as SiteContentDoc);
}

export async function publishSiteContent(byName: string | null): Promise<SiteContentDoc> {
  if (!ENV.firebaseConfigured) {
    return { ...defaultsFrom(SITE_CONTENT_DOC_ID), id: SITE_CONTENT_DOC_ID, updatedByName: byName };
  }
  const doc = getFirestoreDb().collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC_ID);
  const snap = await doc.get();
  const current = mapSiteContent(snap) ?? ({ ...defaultsFrom(doc.id), id: doc.id } as SiteContentDoc);
  await doc.update({
    status: "published",
    previous: current.content,
    version: (current.version ?? 0) + 1,
    publishedAt: new Date(),
    updatedAt: new Date(),
    updatedByName: byName,
  } satisfies StoredSiteContent);
  const updated = await doc.get();
  return mapSiteContent(updated) ?? current;
}

/** Rolls the working draft back to the last published version. */
export async function revertSiteContent(byName: string | null): Promise<SiteContentDoc> {
  if (!ENV.firebaseConfigured) {
    return { ...defaultsFrom(SITE_CONTENT_DOC_ID), id: SITE_CONTENT_DOC_ID, updatedByName: byName };
  }
  const doc = getFirestoreDb().collection(SITE_CONTENT_COLLECTION).doc(SITE_CONTENT_DOC_ID);
  const snap = await doc.get();
  const current = mapSiteContent(snap) ?? ({ ...defaultsFrom(doc.id), id: doc.id } as SiteContentDoc);
  if (!current.previous) return current;
  await doc.update({
    status: "draft",
    content: current.previous,
    previous: null,
    updatedAt: new Date(),
    updatedByName: byName,
  } satisfies StoredSiteContent);
  const updated = await doc.get();
  return mapSiteContent(updated) ?? current;
}

/* ---------------------------------------------------------------------------
 * Password resets (forgot / reset password flow).
 * A reset row is created with a random token and expiry; the token doubles as
 * the document id so lookups are O(1). Rows are single-use.
 * ------------------------------------------------------------------------- */

export type PasswordResetRow = {
  token: string;
  email: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
};

function mapPasswordReset(doc: DocumentSnapshot): PasswordResetRow | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    token: doc.id,
    email: String(data.email ?? ""),
    userId: String(data.userId ?? ""),
    expiresAt: toDate(data.expiresAt),
    createdAt: toDate(data.createdAt),
    used: data.used === true,
  };
}

/** Creates a single-use reset row. Returns the token (empty string if offline). */
export async function createPasswordReset(
  userId: string,
  email: string,
  ttlMs: number
): Promise<string> {
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  if (!ENV.firebaseConfigured) return "";
  const now = new Date();
  await getFirestoreDb().collection(PASSWORD_RESETS_COLLECTION).doc(token).set({
    email,
    userId,
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
    used: false,
  });
  return token;
}

export async function findPasswordReset(token: string): Promise<PasswordResetRow | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb().collection(PASSWORD_RESETS_COLLECTION).doc(token).get();
  return mapPasswordReset(doc);
}

/** Marks a reset row used and removes it once consumed. */
export async function consumePasswordReset(token: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb().collection(PASSWORD_RESETS_COLLECTION).doc(token).delete();
}