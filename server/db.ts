import { EMAIL_LOGIN_METHOD } from "@shared/const";
import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import type { User } from "@shared/user";
import type {
  CreateResourceInput,
  Resource,
  ResourceWithContent,
} from "@shared/resource";
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
import type {
  LandingContent,
  SiteContentDoc,
  SiteContentStatus,
} from "@shared/site";
import { defaultLandingContent, SITE_CONTENT_DOC_ID } from "@shared/site";
import type { ClassGroup } from "@shared/class";
import type {
  ContactMessage,
  MessageStatus,
  ContactType,
} from "@shared/message";
import type { School, SchoolStatus } from "@shared/school";
import { ENV } from "./_core/env";
import { getFirestoreDb } from "./_core/firebase";

const USERS_COLLECTION = "users";
const RESOURCES_COLLECTION = "resources";
const LIVE_SESSIONS_COLLECTION = "liveSessions";
const SCHEMES_COLLECTION = "schemes";
const ASSIGNMENTS_COLLECTION = "assignments";
const SITE_CONTENT_COLLECTION = "siteContent";
const PASSWORD_RESETS_COLLECTION = "passwordResets";
const SITE_IMAGES_COLLECTION = "siteImages";
const CLASSES_COLLECTION = "classes";
const MESSAGES_COLLECTION = "messages";
const SCHOOLS_COLLECTION = "schools";

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
  status?: User["status"];
  preferences?: User["preferences"];
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
    status: (data.status ?? "active") as User["status"],
    preferences: data.preferences ?? null,
    passwordHash: data.passwordHash ?? null,
    passwordSalt: data.passwordSalt ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastSignedIn: toDate(data.lastSignedIn),
  };
}

export async function getUserByOpenId(
  openId: string,
): Promise<User | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(openId)
    .get();
  return mapUser(doc);
}

export async function findUserByEmail(
  email: string,
): Promise<User | undefined> {
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
  status?: User["status"];
  preferences?: User["preferences"];
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
  if (user.loginMethod !== undefined)
    store.loginMethod = user.loginMethod ?? null;
  if (user.role !== undefined) store.role = user.role;
  else if (user.openId === ENV.ownerOpenId) store.role = "admin";
  if (user.status !== undefined) store.status = user.status;
  if (user.preferences !== undefined) store.preferences = user.preferences;
  if (user.passwordHash !== undefined)
    store.passwordHash = user.passwordHash ?? null;
  if (user.passwordSalt !== undefined)
    store.passwordSalt = user.passwordSalt ?? null;
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

export async function createEmailUser(
  input: CreateEmailUserInput,
): Promise<User> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first.",
    );
  }

  const now = new Date();
  const store: StoredUser = {
    name: input.name,
    email: input.email,
    loginMethod: EMAIL_LOGIN_METHOD,
    role: input.role,
    status: "active",
    preferences: null,
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

function mapResource(
  includeContent: boolean,
  doc: DocumentSnapshot,
): ResourceWithContent | undefined {
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
    createdByName:
      typeof data.createdByName === "string" ? data.createdByName : null,
    grade: typeof data.grade === "string" ? data.grade : null,
    subjectId: typeof data.subjectId === "string" ? data.subjectId : null,
    subject: typeof data.subject === "string" ? data.subject : null,
    term: typeof data.term === "string" ? data.term : null,
    week: typeof data.week === "string" ? data.week : null,
    createdAt: toDate(data.createdAt).toISOString(),
    dataBase64:
      includeContent && typeof data.dataBase64 === "string"
        ? data.dataBase64
        : null,
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

export async function getResource(
  id: string,
): Promise<ResourceWithContent | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb()
    .collection(RESOURCES_COLLECTION)
    .doc(id)
    .get();
  return mapResource(true, doc);
}

export async function createResource(
  input: CreateResourceInput & {
    createdBy: string;
    createdByName: string | null;
  },
): Promise<Resource> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first.",
    );
  }

  const now = new Date();
  const store: StoredResource = {
    kind: input.kind,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    youtubeId: input.kind === "video" ? (input.youtubeId ?? null) : null,
    fileName: input.kind === "file" ? (input.fileName ?? null) : null,
    mimeType: input.kind === "file" ? (input.mimeType ?? null) : null,
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
    dataBase64: input.kind === "file" ? (input.dataBase64 ?? null) : null,
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

export async function getLiveSession(
  id: string,
): Promise<LiveSession | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb()
    .collection(LIVE_SESSIONS_COLLECTION)
    .doc(id)
    .get();
  return mapLiveSession(doc);
}

export async function createLiveSession(
  input: CreateLiveSessionInput & { hostBy: string; hostName: string | null },
  id?: string,
): Promise<LiveSession> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first.",
    );
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

  const doc = getFirestoreDb()
    .collection(LIVE_SESSIONS_COLLECTION)
    .doc(id ?? nanoid(18));
  await doc.set(store);
  const created = await doc.get();
  const session = mapLiveSession(created);
  if (!session) throw new Error("Failed to read back the created live session");
  return session;
}

export async function updateLiveSession(
  id: string,
  input: UpdateLiveSessionInput & { hostBy: string; hostName: string | null },
): Promise<LiveSession | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = getFirestoreDb().collection(LIVE_SESSIONS_COLLECTION).doc(id);
  const patch: StoredLiveSession = { updatedAt: new Date() };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined)
    patch.description = input.description.trim();
  if (input.grade !== undefined) patch.grade = input.grade ?? null;
  if (input.subjectId !== undefined) patch.subjectId = input.subjectId ?? null;
  if (input.subject !== undefined) patch.subject = input.subject ?? null;
  if (input.term !== undefined) patch.term = input.term ?? null;
  if (input.week !== undefined) patch.week = input.week ?? null;
  if (input.platform !== undefined) patch.platform = input.platform;
  if (input.meetingUrl !== undefined)
    patch.meetingUrl = input.meetingUrl ?? null;
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
  const doc = await getFirestoreDb()
    .collection(SCHEMES_COLLECTION)
    .doc(id)
    .get();
  return mapScheme(doc);
}

export async function createSchemes(schemes: Scheme[]): Promise<Scheme[]> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first.",
    );
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
  currentWeek: string,
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
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
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
    createdByName:
      typeof data.createdByName === "string" ? data.createdByName : null,
    createdAt: toDate(data.createdAt).toISOString(),
    status: (data.status ?? "Scheduled") as AssignmentStatus,
    questions: Array.isArray(data.questions)
      ? (data.questions as AssessmentQuestion[])
      : [],
    fileUrl:
      typeof data.fileUrl === "string" && data.fileUrl.length > 0
        ? data.fileUrl
        : null,
    fileName:
      typeof data.fileName === "string" && data.fileName.length > 0
        ? data.fileName
        : null,
    fileSize: typeof data.fileSize === "number" ? data.fileSize : null,
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
  input: CreateAssignmentInput & {
    createdBy: string;
    createdByName: string | null;
  },
): Promise<Assignment> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first.",
    );
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
    fileUrl: input.fileUrl ?? null,
    fileName: input.fileName ?? null,
    fileSize: input.fileSize ?? null,
  };

  const doc = getFirestoreDb()
    .collection(ASSIGNMENTS_COLLECTION)
    .doc(nanoid(18));
  await doc.set(store);
  const created = await doc.get();
  const assignment = mapAssignment(created);
  if (!assignment)
    throw new Error("Failed to read back the created assignment");
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
    content:
      (data.content as LandingContent | undefined) ?? defaultLandingContent(),
    previous: (data.previous as LandingContent | null | undefined) ?? null,
    version: typeof data.version === "number" ? data.version : 1,
    updatedAt: toDate(data.updatedAt).toISOString(),
    publishedAt: data.publishedAt
      ? toDate(data.publishedAt).toISOString()
      : null,
    updatedByName:
      typeof data.updatedByName === "string" ? data.updatedByName : null,
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
    return {
      ...store,
      id: SITE_CONTENT_DOC_ID,
      publishedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as SiteContentDoc;
  }
  return (
    mapSiteContent(snap) ??
    ({ ...defaultsFrom(doc.id), id: doc.id } as SiteContentDoc)
  );
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
  byName: string | null,
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
  const doc = getFirestoreDb()
    .collection(SITE_CONTENT_COLLECTION)
    .doc(SITE_CONTENT_DOC_ID);
  await doc.set(
    {
      status: "draft",
      content,
      updatedAt: new Date(),
      updatedByName: byName,
    } satisfies StoredSiteContent,
    { merge: true },
  );
  const updated = await doc.get();
  return (
    mapSiteContent(updated) ??
    ({ ...defaultsFrom(doc.id), id: doc.id, content } as SiteContentDoc)
  );
}

export async function publishSiteContent(
  byName: string | null,
): Promise<SiteContentDoc> {
  if (!ENV.firebaseConfigured) {
    return {
      ...defaultsFrom(SITE_CONTENT_DOC_ID),
      id: SITE_CONTENT_DOC_ID,
      updatedByName: byName,
    };
  }
  const doc = getFirestoreDb()
    .collection(SITE_CONTENT_COLLECTION)
    .doc(SITE_CONTENT_DOC_ID);
  const snap = await doc.get();
  const current =
    mapSiteContent(snap) ??
    ({ ...defaultsFrom(doc.id), id: doc.id } as SiteContentDoc);
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
export async function revertSiteContent(
  byName: string | null,
): Promise<SiteContentDoc> {
  if (!ENV.firebaseConfigured) {
    return {
      ...defaultsFrom(SITE_CONTENT_DOC_ID),
      id: SITE_CONTENT_DOC_ID,
      updatedByName: byName,
    };
  }
  const doc = getFirestoreDb()
    .collection(SITE_CONTENT_COLLECTION)
    .doc(SITE_CONTENT_DOC_ID);
  const snap = await doc.get();
  const current =
    mapSiteContent(snap) ??
    ({ ...defaultsFrom(doc.id), id: doc.id } as SiteContentDoc);
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
  ttlMs: number,
): Promise<string> {
  const token =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  if (!ENV.firebaseConfigured) return "";
  const now = new Date();
  await getFirestoreDb()
    .collection(PASSWORD_RESETS_COLLECTION)
    .doc(token)
    .set({
      email,
      userId,
      expiresAt: new Date(now.getTime() + ttlMs),
      createdAt: now,
      used: false,
    });
  return token;
}

export async function findPasswordReset(
  token: string,
): Promise<PasswordResetRow | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = await getFirestoreDb()
    .collection(PASSWORD_RESETS_COLLECTION)
    .doc(token)
    .get();
  return mapPasswordReset(doc);
}

/** Marks a reset row used and removes it once consumed. */
export async function consumePasswordReset(token: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb()
    .collection(PASSWORD_RESETS_COLLECTION)
    .doc(token)
    .delete();
}

/* ---------------------------------------------------------------------------
 * Admin console (team & access, overview counts).
 * JSON-safe summaries only — hashes and salts never leave the server.
 * ------------------------------------------------------------------------- */

export type AdminUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: User["role"];
  status: User["status"];
  isOwner: boolean;
  createdAt: string;
  lastSignedIn: string;
};

function mapAdminUser(doc: DocumentSnapshot): AdminUserSummary | undefined {
  const user = mapUser(doc);
  if (!user) return undefined;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    role: user.role,
    status: user.status,
    isOwner: user.openId === ENV.ownerOpenId && ENV.ownerOpenId.length > 0,
    createdAt: user.createdAt.toISOString(),
    lastSignedIn: user.lastSignedIn.toISOString(),
  };
}

export async function listUsers(): Promise<AdminUserSummary[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();
  return snap.docs
    .map((doc) => mapAdminUser(doc))
    .filter((user): user is AdminUserSummary => Boolean(user));
}

export async function setUserRole(
  openId: string,
  role: NonNullable<User["role"]>,
): Promise<AdminUserSummary | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(openId)
    .set({ role, updatedAt: new Date() }, { merge: true });
  const doc = await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(openId)
    .get();
  return mapAdminUser(doc);
}

/** Suspends or reactivates an account. Suspended users lose sign-in + live sessions. */
export async function setUserStatus(
  openId: string,
  status: User["status"],
): Promise<AdminUserSummary | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(openId)
    .set({ status, updatedAt: new Date() }, { merge: true });
  const doc = await getFirestoreDb()
    .collection(USERS_COLLECTION)
    .doc(openId)
    .get();
  return mapAdminUser(doc);
}

/** Deletes a user account and cleans them out of any classes (teacher seat or student roster). */
export async function deleteUser(openId: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  const firestore = getFirestoreDb();
  await firestore.collection(USERS_COLLECTION).doc(openId).delete();

  const batch = firestore.batch();
  const tutorClasses = await firestore
    .collection(CLASSES_COLLECTION)
    .where("tutorId", "==", openId)
    .get();
  tutorClasses.forEach((doc) => {
    batch.update(doc.ref, {
      tutorId: null,
      tutorName: null,
      updatedAt: new Date(),
    });
  });
  const studentClasses = await firestore
    .collection(CLASSES_COLLECTION)
    .where("studentIds", "array-contains", openId)
    .get();
  studentClasses.forEach((doc) => {
    const studentIds = (doc.data().studentIds ?? []).filter(
      (id: string) => id !== openId,
    );
    batch.update(doc.ref, { studentIds, updatedAt: new Date() });
  });
  await batch.commit();
}

export type AdminOverviewData = {
  users: number;
  resources: number;
  liveSessions: number;
  schemes: number;
  assignments: number;
  recentUsers: AdminUserSummary[];
};

export async function getAdminOverview(): Promise<AdminOverviewData> {
  if (!ENV.firebaseConfigured) {
    return {
      users: 0,
      resources: 0,
      liveSessions: 0,
      schemes: 0,
      assignments: 0,
      recentUsers: [],
    };
  }
  const db = getFirestoreDb();
  const [users, resources, liveSessions, schemes, assignments, recentUsers] =
    await Promise.all([
      db.collection(USERS_COLLECTION).count().get(),
      db.collection(RESOURCES_COLLECTION).count().get(),
      db.collection(LIVE_SESSIONS_COLLECTION).count().get(),
      db.collection(SCHEMES_COLLECTION).count().get(),
      db.collection(ASSIGNMENTS_COLLECTION).count().get(),
      db
        .collection(USERS_COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
    ]);
  return {
    users: users.data().count,
    resources: resources.data().count,
    liveSessions: liveSessions.data().count,
    schemes: schemes.data().count,
    assignments: assignments.data().count,
    recentUsers: recentUsers.docs
      .map((doc) => mapAdminUser(doc))
      .filter((user): user is AdminUserSummary => Boolean(user)),
  };
}

/* ---------------------------------------------------------------------------
 * Landing-page images.
 * Stored as base64 in their own Firestore doc (one image per doc) so the
 * landing content document itself stays small. Served via GET /site-images/:id.
 * ------------------------------------------------------------------------- */

export type StoredSiteImage = {
  mimeType: string;
  dataBase64: string;
  createdAt?: Date;
};

export async function saveSiteImage(
  id: string,
  mimeType: string,
  dataBase64: string,
): Promise<void> {
  if (!ENV.firebaseConfigured) {
    throw new Error("Firestore is not configured — cannot store the image.");
  }
  await getFirestoreDb()
    .collection(SITE_IMAGES_COLLECTION)
    .doc(id)
    .set({
      mimeType,
      dataBase64,
      createdAt: new Date(),
    } satisfies StoredSiteImage);
}

export async function getSiteImage(
  id: string,
): Promise<StoredSiteImage | null> {
  if (!ENV.firebaseConfigured) return null;
  const snap = await getFirestoreDb()
    .collection(SITE_IMAGES_COLLECTION)
    .doc(id)
    .get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  if (typeof data.dataBase64 !== "string") return null;
  return {
    mimeType: typeof data.mimeType === "string" ? data.mimeType : "image/png",
    dataBase64: data.dataBase64,
  };
}

/* ---------------------------------------------------------------------------
 * Classes (admin-created groups assigned to teachers).
 * Each class is a plain Firestore doc: one owning tutor + a learner array.
 * ------------------------------------------------------------------------- */

function mapClassGroup(doc: DocumentSnapshot): ClassGroup | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: String(data.name ?? "Untitled class"),
    grade: typeof data.grade === "string" ? data.grade : null,
    subject: typeof data.subject === "string" ? data.subject : null,
    tutorId: typeof data.tutorId === "string" ? data.tutorId : null,
    tutorName: typeof data.tutorName === "string" ? data.tutorName : null,
    studentIds: Array.isArray(data.studentIds)
      ? data.studentIds.map((id: unknown) => String(id)).filter(Boolean)
      : [],
    createdAt: toDate(data.createdAt).toISOString(),
    updatedAt: toDate(data.updatedAt).toISOString(),
  };
}

export async function listClasses(): Promise<ClassGroup[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(CLASSES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();
  return snap.docs
    .map((doc) => mapClassGroup(doc))
    .filter((group): group is ClassGroup => Boolean(group));
}

export type CreateClassInput = {
  name: string;
  grade?: string | null;
  subject?: string | null;
  tutorId?: string | null;
  tutorName?: string | null;
  studentIds?: string[];
};

export async function createClass(
  input: CreateClassInput,
): Promise<ClassGroup> {
  if (!ENV.firebaseConfigured) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_* credentials in .env first.",
    );
  }
  const now = new Date();
  const doc = getFirestoreDb().collection(CLASSES_COLLECTION).doc(nanoid(18));
  await doc.set({
    name: input.name.trim(),
    grade: input.grade ?? null,
    subject: input.subject ?? null,
    tutorId: input.tutorId ?? null,
    tutorName: input.tutorName ?? null,
    studentIds: input.studentIds ?? [],
    createdAt: now,
    updatedAt: now,
  });
  const created = await doc.get();
  const group = mapClassGroup(created);
  if (!group) throw new Error("Failed to read back the created class");
  return group;
}

export type UpdateClassInput = Partial<CreateClassInput>;

export async function updateClass(
  id: string,
  input: UpdateClassInput,
): Promise<ClassGroup | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.grade !== undefined) patch.grade = input.grade ?? null;
  if (input.subject !== undefined) patch.subject = input.subject ?? null;
  if (input.tutorId !== undefined) patch.tutorId = input.tutorId ?? null;
  if (input.tutorName !== undefined) patch.tutorName = input.tutorName ?? null;
  if (input.studentIds !== undefined)
    patch.studentIds = input.studentIds.map((id) => String(id)).filter(Boolean);
  const doc = getFirestoreDb().collection(CLASSES_COLLECTION).doc(id);
  await doc.update(patch);
  return mapClassGroup(await doc.get());
}

export async function deleteClass(id: string): Promise<void> {
  if (!ENV.firebaseConfigured) return;
  await getFirestoreDb().collection(CLASSES_COLLECTION).doc(id).delete();
}

/* ---------------------------------------------------------------------------
 * Contact messages (landing "Contact us" form) — the admin inbox.
 * ------------------------------------------------------------------------- */

type StoredContactMessage = {
  type?: ContactType;
  name?: string;
  email?: string;
  phone?: string | null;
  message?: string;
  schoolName?: string | null;
  roleAtSchool?: string | null;
  learnerCount?: string | null;
  status?: MessageStatus;
  createdAt?: Date;
  readAt?: Date | null;
};

function mapContactMessage(doc: DocumentSnapshot): ContactMessage | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    type: (data.type === "school" ? "school" : "general") as ContactType,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: typeof data.phone === "string" ? data.phone : null,
    message: String(data.message ?? ""),
    schoolName: typeof data.schoolName === "string" ? data.schoolName : null,
    roleAtSchool:
      typeof data.roleAtSchool === "string" ? data.roleAtSchool : null,
    learnerCount:
      typeof data.learnerCount === "string" ? data.learnerCount : null,
    status: (data.status ?? "new") as MessageStatus,
    createdAt: toDate(data.createdAt).toISOString(),
    readAt: data.readAt ? toDate(data.readAt).toISOString() : null,
  };
}

export type CreateContactMessageInput = {
  type: ContactType;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  schoolName?: string | null;
  roleAtSchool?: string | null;
  learnerCount?: string | null;
};

export async function createContactMessage(
  input: CreateContactMessageInput,
): Promise<ContactMessage> {
  if (!ENV.firebaseConfigured) {
    const doc = {
      id: `msg_${input.email.replace(/[^a-z0-9]/gi, "").slice(0, 8)}`,
    } as ContactMessage;
    return doc;
  }
  const now = new Date();
  const doc = getFirestoreDb().collection(MESSAGES_COLLECTION).doc(nanoid(18));
  await doc.set({
    type: input.type,
    name: String(input.name).trim(),
    email: String(input.email).trim(),
    phone: input.phone?.trim() || null,
    message: String(input.message).trim(),
    schoolName: input.schoolName?.trim() || null,
    roleAtSchool: input.roleAtSchool?.trim() || null,
    learnerCount: input.learnerCount?.trim() || null,
    status: "new",
    createdAt: now,
    readAt: null,
  } satisfies StoredContactMessage);
  const created = await doc.get();
  const message = mapContactMessage(created);
  if (!message) throw new Error("Failed to read back the created message");
  return message;
}

export async function listMessages(): Promise<ContactMessage[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(MESSAGES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();
  return snap.docs
    .map((doc) => mapContactMessage(doc))
    .filter((message): message is ContactMessage => Boolean(message));
}

export async function updateMessageStatus(
  id: string,
  status: MessageStatus,
): Promise<ContactMessage | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = getFirestoreDb().collection(MESSAGES_COLLECTION).doc(id);
  const patch: Record<string, unknown> = { status };
  if (status !== "new") patch.readAt = patch.readAt ?? new Date();
  await doc.update(patch);
  return mapContactMessage(await doc.get());
}

/* ---------------------------------------------------------------------------
 * Schools (partnership & API-access requests).
 * ------------------------------------------------------------------------- */

type StoredSchool = {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string | null;
  learnerCount?: string | null;
  messageId?: string | null;
  status?: SchoolStatus;
  apiKey?: string | null;
  createdAt?: Date;
  decidedAt?: Date | null;
};

function mapSchool(doc: DocumentSnapshot): School | undefined {
  if (!doc.exists) return undefined;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: String(data.name ?? ""),
    contactName: String(data.contactName ?? ""),
    contactEmail: String(data.contactEmail ?? ""),
    phone: typeof data.phone === "string" ? data.phone : null,
    learnerCount:
      typeof data.learnerCount === "string" ? data.learnerCount : null,
    messageId: typeof data.messageId === "string" ? data.messageId : null,
    status: (data.status ?? "pending") as SchoolStatus,
    apiKey: typeof data.apiKey === "string" ? data.apiKey : null,
    createdAt: toDate(data.createdAt).toISOString(),
    decidedAt: data.decidedAt ? toDate(data.decidedAt).toISOString() : null,
  };
}

export type CreateSchoolInput = {
  name: string;
  contactName: string;
  contactEmail: string;
  phone?: string | null;
  learnerCount?: string | null;
  messageId?: string | null;
};

/** Fetches an existing pending school for a message (dedupe), else creates one. */
export async function upsertSchoolRequest(
  input: CreateSchoolInput,
): Promise<School> {
  if (!ENV.firebaseConfigured) {
    return {
      id: `sch_${input.contactEmail.replace(/[^a-z0-9]/gi, "").slice(0, 6)}`,
      name: input.name,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      phone: input.phone ?? null,
      learnerCount: input.learnerCount ?? null,
      messageId: input.messageId ?? null,
      status: "pending",
      apiKey: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
  }
  const col = getFirestoreDb().collection(SCHOOLS_COLLECTION);
  const existing = await col
    .where("contactEmail", "==", input.contactEmail.toLowerCase())
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existing.empty) {
    const found = mapSchool(existing.docs[0]);
    if (found) return found;
  }
  const now = new Date();
  const doc = col.doc(nanoid(18));
  await doc.set({
    name: String(input.name).trim(),
    contactName: String(input.contactName).trim(),
    contactEmail: String(input.contactEmail).trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    learnerCount: input.learnerCount?.trim() || null,
    messageId: input.messageId ?? null,
    status: "pending",
    apiKey: null,
    createdAt: now,
    decidedAt: null,
  } satisfies StoredSchool);
  const created = await doc.get();
  const school = mapSchool(created);
  if (!school) throw new Error("Failed to read back the created school");
  return school;
}

export async function listSchools(): Promise<School[]> {
  if (!ENV.firebaseConfigured) return [];
  const snap = await getFirestoreDb()
    .collection(SCHOOLS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();
  return snap.docs
    .map((doc) => mapSchool(doc))
    .filter((school): school is School => Boolean(school));
}

export async function decideSchool(
  id: string,
  status: SchoolStatus,
  apiKey: string | null,
): Promise<School | undefined> {
  if (!ENV.firebaseConfigured) return undefined;
  const doc = getFirestoreDb().collection(SCHOOLS_COLLECTION).doc(id);
  await doc.update({
    status,
    ...(apiKey !== null ? { apiKey } : {}),
    decidedAt: new Date(),
  });
  return mapSchool(await doc.get());
}
