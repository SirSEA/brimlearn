// Featherweight tRPC-over-HTTP client for the two client-facing procedures
// used by the SPA. Kept dependency-free on purpose:
//   - localhost full-stack dev: talks to the Express/tRPC backend on the same
//     origin (/api/trpc/*).
//   - Netlify static hosting: there is no backend, /api/* returns 404 (see
//     netlify.toml), so the client reports "offline" and callers fall back to
//     the self-contained demo behaviour without breaking.
//
// Wire format matches @trpc/server v11 (single, non-batched HTTP calls):
//   - queries:   GET  {path}?input={json:input} -> { result: { data: { json, meta } } }
//   - mutations: POST {path} body: superjson.serialize(input)
//   - data is superjson-serialized; only JSON-safe values are read here.
import superjson from "superjson";
import type {
  LiveSession,
  CreateLiveSessionInput,
  UpdateLiveSessionInput,
} from "@shared/session";
import type { Scheme, ImportSchemeInput } from "@shared/scheme";
import type {
  Assignment,
  AssignmentAudience,
  AssignmentDifficulty,
  AssignmentType,
  AssessmentQuestion,
  CreateAssignmentInput,
} from "@shared/assignment";
import type { LandingContent, SiteContentDoc } from "@shared/site";
import type { ClassGroup } from "@shared/class";
import type {
  ContactMessage,
  ContactType,
  MessageStatus,
} from "@shared/message";
import type { School, SchoolStatus } from "@shared/school";
import type {
  ChatContact,
  ChatMessage,
  ChatMessageType,
  ChatRoom,
  CreateChatMessageInput,
} from "@shared/chat";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  /** active | suspended. Suspended users are blocked at the auth middleware. */
  status?: "active" | "suspended";
  preferences?: { emailNotifications?: boolean } | null;
  loginMethod?: string | null;
  /** Present on auth.me responses; used by the profile page. */
  createdAt?: string;
  lastSignedIn?: string;
};

export type AuthRole = "user" | "student" | "parent" | "tutor" | "admin";

export type SignupRole = "student" | "parent" | "tutor";

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
};

export type QuizDifficulty = "easy" | "medium" | "hard" | "advanced";

/** A practice-quiz item — objective (choice) or self-calculated (numeric/expression). */
export type QuizQuestion = AssessmentQuestion;

export type GeneratedQuiz = {
  title: string;
  questions: QuizQuestion[];
};

export type QuizInput = {
  subject: string;
  grade: string;
  term: string;
  topic: string;
  count: number;
  difficulty: QuizDifficulty;
};

export type ObjectivesAssessmentInput = {
  schemeId: string;
  week?: string | null;
  assessmentType: "quiz" | "assessment";
  count: number;
  difficulty: QuizDifficulty;
};

export type ObjectivesAssessment = {
  title: string;
  questions: AssessmentQuestion[];
  suggestions: string[];
  /** True when the AI service was unavailable and a local scheme fallback was used. */
  fallback?: boolean;
  /** Short server reason for the fallback (payment/quota, timeout, auth…). */
  fallbackReason?: string;
};

export type PasswordResetRequestResult = {
  ok: boolean;
  /** True when no mail server is configured and the reset link is returned
   *  directly so the flow can be tested for free. */
  demoMode: boolean;
  resetUrl: string | null;
};

export type ResourceCategory =
  "recording" | "reading" | "material" | "worksheet";
export type ResourceKind = "video" | "file";

export type Resource = {
  id: string;
  kind: ResourceKind;
  category: ResourceCategory;
  title: string;
  description: string;
  youtubeId: string | null;
  fileName: string | null;
  mimeType: string | null;
  size: number;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  grade: string | null;
  subjectId: string | null;
  subject: string | null;
  term: string | null;
  week: string | null;
};

export type ResourceWithContent = Resource & {
  dataBase64: string | null;
};

export type CreateResourceInput = {
  kind: ResourceKind;
  category: ResourceCategory;
  title: string;
  description?: string;
  youtubeId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  dataBase64?: string | null;
  grade?: string | null;
  subjectId?: string | null;
  subject?: string | null;
  term?: string | null;
  week?: string | null;
};

export type {
  Assignment,
  AssignmentAudience,
  AssignmentDifficulty,
  AssignmentType,
  AssessmentQuestion,
  CreateAssignmentInput,
};

export type { LiveSession, CreateLiveSessionInput, UpdateLiveSessionInput };

export type { Scheme, ImportSchemeInput };

export type { LandingContent, SiteContentDoc };

export type { ClassGroup };
export type { ContactMessage, ContactType, MessageStatus };
export type { School, SchoolStatus };

export type {
  ChatContact,
  ChatMessage,
  ChatMessageType,
  ChatRoom,
  CreateChatMessageInput,
};

export type AuthStatus = "active" | "suspended";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: AuthRole;
  status: AuthStatus;
  isOwner: boolean;
  createdAt: string;
  lastSignedIn: string;
};

export type UpdateProfileInput = {
  name?: string;
  email?: string;
  preferences?: { emailNotifications?: boolean };
};

export type ContactSubmitInput = {
  type: ContactType;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  schoolName?: string | null;
  roleAtSchool?: string | null;
  learnerCount?: string | null;
};

export type ContactSubmitResult = {
  ok: boolean;
  messageId: string | null;
  schoolId: string | null;
  notified: boolean;
};

export type AdminOverview = {
  users: number;
  resources: number;
  liveSessions: number;
  schemes: number;
  assignments: number;
  recentUsers: AdminUser[];
};

/** Thrown when there is no backend to call (Netlify) or it errored. */
export class ApiUnavailableError extends Error {
  constructor(message = "BrimLearn API is unavailable (offline demo mode)") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

/** Thrown when the server responded with a validation/auth error (e.g. wrong password). */
export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const ENDPOINTS = {
  me: "/api/trpc/auth.me",
  login: "/api/trpc/auth.login",
  signup: "/api/trpc/auth.signup",
  adminLogin: "/api/trpc/auth.adminLogin",
  logout: "/api/trpc/auth.logout",
  generateQuiz: "/api/trpc/quiz.generate",
  listResources: "/api/trpc/resources.list",
  getResource: "/api/trpc/resources.get",
  createResource: "/api/trpc/resources.create",
  removeResource: "/api/trpc/resources.remove",
  listLiveSessions: "/api/trpc/liveSessions.list",
  getLiveSession: "/api/trpc/liveSessions.get",
  createLiveSession: "/api/trpc/liveSessions.create",
  updateLiveSession: "/api/trpc/liveSessions.update",
  removeLiveSession: "/api/trpc/liveSessions.remove",
  listSchemes: "/api/trpc/schemes.list",
  getScheme: "/api/trpc/schemes.get",
  importSchemes: "/api/trpc/schemes.import",
  setCurrentWeek: "/api/trpc/schemes.setCurrentWeek",
  removeScheme: "/api/trpc/schemes.remove",
  listAssignments: "/api/trpc/assignments.list",
  createAssignment: "/api/trpc/assignments.create",
  removeAssignment: "/api/trpc/assignments.remove",
  requestPasswordReset: "/api/trpc/auth.requestPasswordReset",
  resetPassword: "/api/trpc/auth.resetPassword",
  getSiteContent: "/api/trpc/site.get",
  updateSiteContent: "/api/trpc/site.update",
  publishSiteContent: "/api/trpc/site.publish",
  revertSiteContent: "/api/trpc/site.revert",
  uploadSiteImage: "/api/trpc/site.uploadImage",
  generateFromObjectives: "/api/trpc/quiz.generateFromObjectives",
  adminOverview: "/api/trpc/admin.overview",
  listAdminUsers: "/api/trpc/admin.users.list",
  setAdminUserRole: "/api/trpc/admin.users.setRole",
  setAdminUserStatus: "/api/trpc/admin.users.setStatus",
  removeAdminUser: "/api/trpc/admin.users.remove",
  sendAdminUserReset: "/api/trpc/admin.users.sendResetEmail",
  sendAdminUserEmail: "/api/trpc/admin.users.sendEmail",
  listAdminClasses: "/api/trpc/admin.classes.list",
  createAdminClass: "/api/trpc/admin.classes.create",
  updateAdminClass: "/api/trpc/admin.classes.update",
  removeAdminClass: "/api/trpc/admin.classes.remove",
  listAdminMessages: "/api/trpc/admin.messages.list",
  setAdminMessageStatus: "/api/trpc/admin.messages.setStatus",
  listAdminSchools: "/api/trpc/admin.schools.list",
  decideAdminSchool: "/api/trpc/admin.schools.decide",
  updateProfile: "/api/trpc/auth.updateProfile",
  changePassword: "/api/trpc/auth.changePassword",
  submitContact: "/api/trpc/contact.submit",
  chatContacts: "/api/trpc/chat.contacts",
  listChatRooms: "/api/trpc/chat.rooms.list",
  openChatRoom: "/api/trpc/chat.rooms.open",
  markChatRoomRead: "/api/trpc/chat.rooms.markRead",
  listChatMessages: "/api/trpc/chat.messages.list",
  sendChatMessage: "/api/trpc/chat.messages.send",
  reactToChatMessage: "/api/trpc/chat.messages.react",
  deleteChatMessage: "/api/trpc/chat.messages.delete",
} as const;

type Availability = "unknown" | "online" | "offline";

let availability: Availability = "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapData(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  const result = payload.result;
  if (!isRecord(result)) return payload;
  const data = result.data;
  if (isRecord(data) && "json" in data) return data.json;
  return data;
}

/**
 * Probe the API once per session. Because Netlify answers /api/* with 404,
 * "online" is exactly "the tRPC endpoint responded ok" — no heuristics needed.
 */
async function probeApi(): Promise<boolean> {
  if (availability !== "unknown") return availability === "online";

  availability = await fetch(ENDPOINTS.me)
    .then((res) => (res.ok ? "online" : "offline"))
    .catch(() => "offline");

  return availability === "online";
}

function requestOptions(): Record<string, string> {
  return {
    "trpc-accept": "application/json",
  };
}

/** superjson-wraps an input object for the tRPC HTTP transport. */
function wrapInput(input: unknown): string {
  return JSON.stringify(superjson.serialize(input));
}

/**
 * Returns the signed-in user, or null when offline or no session exists.
 * Never throws — offline mode is a first-class state, not an error.
 */
async function getMe(): Promise<AuthUser | null> {
  if (!(await probeApi())) return null;

  try {
    const res = await fetch(ENDPOINTS.me, { headers: requestOptions() });
    if (!res.ok) return null;
    const payload = await res.json();
    return (unwrapData(payload) as AuthUser | null) ?? null;
  } catch {
    return null;
  }
}

/** Best-effort session clear; local state is cleared by the caller. */
async function postLogout(): Promise<void> {
  if (!(await probeApi())) return;

  try {
    await fetch(ENDPOINTS.logout, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...requestOptions(),
      },
      body: wrapInput({}),
    });
  } catch {
    // Best effort. The caller resets local auth state regardless.
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null) return fallback;
  const errorRecord = error as Record<string, unknown>;
  const json = errorRecord.json;
  if (typeof json === "object" && json !== null) {
    const message = (json as Record<string, unknown>).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  const direct = errorRecord.message;
  if (typeof direct === "string" && direct.length > 0) return direct;
  return fallback;
}

/**
 * Runs a tRPC mutation and returns its JSON payload. Throws AuthError with the
 * server's message when the request fails, and ApiUnavailableError offline.
 */
async function postMutation<T>(endpoint: string, input: unknown): Promise<T> {
  if (!(await probeApi()) || availability === "offline") {
    throw new ApiUnavailableError();
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...requestOptions(),
    },
    body: wrapInput(input),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new AuthError(
      extractErrorMessage(payload, `Request failed (${res.status})`),
      res.status,
    );
  }

  const value = unwrapData(await res.json());
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new ApiUnavailableError("Malformed auth response");
  }
  return value as unknown as T;
}

/** Runs a tRPC query (GET) and returns its JSON payload. */
async function getQuery<T>(endpoint: string, input: unknown): Promise<T> {
  if (!(await probeApi()) || availability === "offline") {
    throw new ApiUnavailableError();
  }

  const param = encodeURIComponent(wrapInput(input));
  const res = await fetch(`${endpoint}?input=${param}`, {
    headers: requestOptions(),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new AuthError(
      extractErrorMessage(payload, `Request failed (${res.status})`),
      res.status,
    );
  }

  return unwrapData(await res.json()) as T;
}

/** Runs a tRPC mutation and returns its JSON payload (any shape). */
async function postApi<T>(endpoint: string, input: unknown): Promise<T> {
  if (!(await probeApi()) || availability === "offline") {
    throw new ApiUnavailableError();
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...requestOptions(),
    },
    body: wrapInput(input),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new AuthError(
      extractErrorMessage(payload, `Request failed (${res.status})`),
      res.status,
    );
  }

  return unwrapData(await res.json()) as T;
}

async function listResources(): Promise<Resource[]> {
  const resources = await getQuery<Resource[]>(ENDPOINTS.listResources, {});
  return Array.isArray(resources) ? resources : [];
}

async function getResource(id: string): Promise<ResourceWithContent> {
  const resource = await getQuery<ResourceWithContent>(ENDPOINTS.getResource, {
    id,
  });
  if (!resource || typeof resource.id !== "string") {
    throw new ApiUnavailableError("Malformed resource response");
  }
  return resource;
}

async function createResource(input: CreateResourceInput): Promise<Resource> {
  const resource = await postApi<Resource>(ENDPOINTS.createResource, input);
  if (!resource || typeof resource.id !== "string") {
    throw new ApiUnavailableError("Malformed resource response");
  }
  return resource;
}

function removeResource(id: string): Promise<{ success: boolean }> {
  return postApi<{ success: boolean }>(ENDPOINTS.removeResource, { id });
}

async function listLiveSessions(): Promise<LiveSession[]> {
  const sessions = await getQuery<LiveSession[]>(
    ENDPOINTS.listLiveSessions,
    {},
  );
  return Array.isArray(sessions) ? sessions : [];
}

async function getLiveSession(id: string): Promise<LiveSession> {
  const session = await getQuery<LiveSession>(ENDPOINTS.getLiveSession, { id });
  if (!session || typeof session.id !== "string") {
    throw new ApiUnavailableError("Malformed live session response");
  }
  return session;
}

async function createLiveSession(
  input: CreateLiveSessionInput,
): Promise<LiveSession> {
  const session = await postApi<LiveSession>(
    ENDPOINTS.createLiveSession,
    input,
  );
  if (!session || typeof session.id !== "string") {
    throw new ApiUnavailableError("Malformed live session response");
  }
  return session;
}

function updateLiveSession(
  id: string,
  input: UpdateLiveSessionInput,
): Promise<LiveSession> {
  return postApi<LiveSession>(ENDPOINTS.updateLiveSession, { id, ...input });
}

function removeLiveSession(id: string): Promise<{ success: boolean }> {
  return postApi<{ success: boolean }>(ENDPOINTS.removeLiveSession, { id });
}

async function listSchemes(): Promise<Scheme[]> {
  const schemes = await getQuery<Scheme[]>(ENDPOINTS.listSchemes, {});
  return Array.isArray(schemes) ? schemes : [];
}

async function getScheme(id: string): Promise<Scheme> {
  const scheme = await getQuery<Scheme>(ENDPOINTS.getScheme, { id });
  if (!scheme || typeof scheme.id !== "string") {
    throw new ApiUnavailableError("Malformed scheme response");
  }
  return scheme;
}

function importSchemes(input: ImportSchemeInput): Promise<Scheme[]> {
  return postApi<Scheme[]>(ENDPOINTS.importSchemes, input);
}

function setCurrentWeek(id: string, week: string): Promise<Scheme> {
  return postApi<Scheme>(ENDPOINTS.setCurrentWeek, { id, week });
}

function removeScheme(id: string): Promise<{ success: boolean }> {
  return postApi<{ success: boolean }>(ENDPOINTS.removeScheme, { id });
}

async function listAssignments(): Promise<Assignment[]> {
  const assignments = await getQuery<Assignment[]>(
    ENDPOINTS.listAssignments,
    {},
  );
  return Array.isArray(assignments) ? assignments : [];
}

async function createAssignment(
  input: CreateAssignmentInput,
): Promise<Assignment> {
  const assignment = await postApi<Assignment>(
    ENDPOINTS.createAssignment,
    input,
  );
  if (!assignment || typeof assignment.id !== "string") {
    throw new ApiUnavailableError("Malformed assignment response");
  }
  return assignment;
}

function removeAssignment(id: string): Promise<{ success: boolean }> {
  return postApi<{ success: boolean }>(ENDPOINTS.removeAssignment, { id });
}

async function requestPasswordReset(
  email: string,
): Promise<PasswordResetRequestResult> {
  const result = await postApi<PasswordResetRequestResult>(
    ENDPOINTS.requestPasswordReset,
    { email },
  );
  if (!result || typeof result.ok !== "boolean") {
    throw new ApiUnavailableError("Malformed password-reset response");
  }
  return result;
}

function resetPassword(
  token: string,
  password: string,
): Promise<{ ok: boolean }> {
  return postApi<{ ok: boolean }>(ENDPOINTS.resetPassword, { token, password });
}

/** Public landing-page content with offline defaults fallback. */
async function getSiteContent(): Promise<SiteContentDoc | null> {
  if (!(await probeApi()) || availability === "offline") return null;
  try {
    const doc = await getQuery<SiteContentDoc>(ENDPOINTS.getSiteContent, {});
    return doc && typeof doc.id === "string" && doc.content ? doc : null;
  } catch {
    return null;
  }
}

function updateSiteContent(content: LandingContent): Promise<SiteContentDoc> {
  return postApi<SiteContentDoc>(ENDPOINTS.updateSiteContent, content);
}

export type UploadSiteImageInput = {
  fileName: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  dataBase64: string;
};

function uploadSiteImage(
  input: UploadSiteImageInput,
): Promise<{ url: string; id: string }> {
  return postApi<{ url: string; id: string }>(ENDPOINTS.uploadSiteImage, input);
}

function publishSiteContent(): Promise<SiteContentDoc> {
  return postApi<SiteContentDoc>(ENDPOINTS.publishSiteContent, {});
}

function revertSiteContent(): Promise<SiteContentDoc> {
  return postApi<SiteContentDoc>(ENDPOINTS.revertSiteContent, {});
}

/** Harden AI questions into consistent AssessmentQuestion shapes: choice items
 *  keep an integer option index, numeric/expression items a canonical string. */
function normalizeAssessmentQuestion(q: {
  question?: unknown;
  questionType?: unknown;
  options?: unknown;
  answer?: unknown;
  answerText?: unknown;
  acceptedAnswers?: unknown;
  hint?: unknown;
  unit?: unknown;
  explanation?: unknown;
}): AssessmentQuestion {
  const questionType =
    q.questionType === "numeric" || q.questionType === "expression"
      ? q.questionType
      : "choice";
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  const hint = q.hint != null ? String(q.hint).trim() || null : null;
  const unit = q.unit != null ? String(q.unit).trim() || null : null;
  const acceptedAnswers = Array.isArray(q.acceptedAnswers)
    ? q.acceptedAnswers.map(String).filter(Boolean)
    : [];

  if (questionType === "choice") {
    const index =
      typeof q.answer === "number"
        ? q.answer
        : parseInt(String(q.answer ?? ""), 10);
    return {
      question: String(q.question ?? ""),
      questionType,
      options:
        options.length === 4
          ? options
          : options.length
            ? options.slice(0, 4)
            : ["A", "B", "C", "D"],
      answer: Number.isInteger(index) && index >= 0 && index < 4 ? index : 0,
      hint,
      unit,
      explanation: String(q.explanation ?? ""),
    };
  }

  const answer =
    typeof q.answerText === "string" && q.answerText.trim()
      ? q.answerText.trim()
      : typeof q.answer === "string" && q.answer.trim()
        ? q.answer.trim()
        : String(q.answer ?? "").trim() || "1";
  return {
    question: String(q.question ?? ""),
    questionType,
    options: [],
    answer,
    acceptedAnswers,
    hint,
    unit,
    explanation: String(q.explanation ?? ""),
  };
}

async function generateFromObjectives(
  input: ObjectivesAssessmentInput,
): Promise<ObjectivesAssessment> {
  const assessment = await postApi<ObjectivesAssessment>(
    ENDPOINTS.generateFromObjectives,
    input,
  );
  if (
    !assessment ||
    typeof assessment.title !== "string" ||
    !Array.isArray(assessment.questions)
  ) {
    throw new ApiUnavailableError("Malformed assessment response");
  }
  return {
    title: assessment.title,
    questions: assessment.questions.map((q) => normalizeAssessmentQuestion(q)),
    suggestions: Array.isArray(assessment.suggestions)
      ? assessment.suggestions.map(String)
      : [],
    fallback: assessment.fallback === true,
    fallbackReason:
      typeof assessment.fallbackReason === "string"
        ? assessment.fallbackReason
        : undefined,
  };
}

async function generateQuiz(input: QuizInput): Promise<GeneratedQuiz> {
  if (!(await probeApi()) || availability === "offline") {
    throw new ApiUnavailableError();
  }

  const res = await fetch(ENDPOINTS.generateQuiz, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...requestOptions(),
    },
    body: wrapInput(input),
  });

  if (!res.ok) throw new ApiUnavailableError(`Quiz API failed (${res.status})`);

  const quiz = unwrapData(await res.json()) as GeneratedQuiz | null;
  if (
    !quiz ||
    typeof quiz.title !== "string" ||
    !Array.isArray(quiz.questions)
  ) {
    throw new ApiUnavailableError("Malformed quiz response");
  }

  return {
    title: quiz.title,
    questions: quiz.questions.map((q) => normalizeAssessmentQuestion(q)),
  };
}

async function getAdminOverview(): Promise<AdminOverview> {
  const data = await getQuery<AdminOverview>(ENDPOINTS.adminOverview, {});
  if (!data || typeof data.users !== "number") {
    throw new ApiUnavailableError("Malformed admin overview response");
  }
  return data;
}

async function listAdminUsers(): Promise<AdminUser[]> {
  const users = await getQuery<AdminUser[]>(ENDPOINTS.listAdminUsers, {});
  return Array.isArray(users) ? users : [];
}

function setAdminUserRole(openId: string, role: AuthRole): Promise<AdminUser> {
  return postApi<AdminUser>(ENDPOINTS.setAdminUserRole, { openId, role });
}

function setAdminUserStatus(
  openId: string,
  status: AuthStatus,
): Promise<AdminUser> {
  return postApi<AdminUser>(ENDPOINTS.setAdminUserStatus, { openId, status });
}

function sendAdminUserReset(
  openId: string,
): Promise<{ ok: boolean; demoMode: boolean; resetUrl: string | null }> {
  return postApi(ENDPOINTS.sendAdminUserReset, { openId });
}

function sendAdminUserEmail(input: {
  openId: string;
  subject: string;
  body: string;
}): Promise<{ delivered: boolean }> {
  return postApi(ENDPOINTS.sendAdminUserEmail, input);
}

function removeAdminUser(openId: string): Promise<{ success: boolean }> {
  return postApi<{ success: boolean }>(ENDPOINTS.removeAdminUser, { openId });
}

async function listAdminClasses(): Promise<ClassGroup[]> {
  const classes = await getQuery<ClassGroup[]>(ENDPOINTS.listAdminClasses, {});
  return Array.isArray(classes) ? classes : [];
}

function createAdminClass(
  input: Partial<ClassGroup> & { name: string },
): Promise<ClassGroup> {
  return postApi<ClassGroup>(ENDPOINTS.createAdminClass, input);
}

function updateAdminClass(
  id: string,
  input: Partial<ClassGroup>,
): Promise<ClassGroup> {
  return postApi<ClassGroup>(ENDPOINTS.updateAdminClass, { id, ...input });
}

function removeAdminClass(id: string): Promise<{ success: boolean }> {
  return postApi<{ success: boolean }>(ENDPOINTS.removeAdminClass, { id });
}

async function listAdminMessages(): Promise<ContactMessage[]> {
  const messages = await getQuery<ContactMessage[]>(
    ENDPOINTS.listAdminMessages,
    {},
  );
  return Array.isArray(messages) ? messages : [];
}

function setAdminMessageStatus(
  id: string,
  status: MessageStatus,
): Promise<ContactMessage> {
  return postApi<ContactMessage>(ENDPOINTS.setAdminMessageStatus, {
    id,
    status,
  });
}

async function listAdminSchools(): Promise<School[]> {
  const schools = await getQuery<School[]>(ENDPOINTS.listAdminSchools, {});
  return Array.isArray(schools) ? schools : [];
}

function decideAdminSchool(
  id: string,
  status: "approved" | "rejected",
): Promise<School> {
  return postApi<School>(ENDPOINTS.decideAdminSchool, { id, status });
}

function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return postApi<AuthUser>(ENDPOINTS.updateProfile, input);
}

function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return postApi<{ ok: boolean }>(ENDPOINTS.changePassword, {
    currentPassword,
    newPassword,
  });
}

function submitContact(
  input: ContactSubmitInput,
): Promise<ContactSubmitResult> {
  return postApi<ContactSubmitResult>(ENDPOINTS.submitContact, input);
}

async function listChatContacts(): Promise<ChatContact[]> {
  const contacts = await getQuery<ChatContact[]>(ENDPOINTS.chatContacts, {});
  return Array.isArray(contacts) ? contacts : [];
}

export type UploadChatFileInput = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  type: ChatMessageType;
};

export type UploadChatFileResult = {
  url: string;
  fileName: string;
  fileSize: number;
};

/** Base64 upload for media chat. Falls back to ApiUnavailableError when offline. */
async function uploadChatFile(
  input: UploadChatFileInput,
): Promise<UploadChatFileResult> {
  if (!(await probeApi()) || availability === "offline") {
    throw new ApiUnavailableError();
  }
  const res = await fetch("/api/chat/upload", {
    method: "POST",
    headers: { "content-type": "application/json", ...requestOptions() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new AuthError(
      extractErrorMessage(payload, `Upload failed (${res.status})`),
      res.status,
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  if (typeof data.url !== "string")
    throw new ApiUnavailableError("Malformed upload response");
  return data as unknown as UploadChatFileResult;
}

async function listChatRooms(): Promise<ChatRoom[]> {
  const rooms = await getQuery<ChatRoom[]>(ENDPOINTS.listChatRooms, {});
  return Array.isArray(rooms) ? rooms : [];
}

function openChatRoom(contactId: string): Promise<ChatRoom> {
  return postApi<ChatRoom>(ENDPOINTS.openChatRoom, { contactId });
}

function markChatRoomRead(roomId: string): Promise<{ ok: boolean }> {
  return postApi<{ ok: boolean }>(ENDPOINTS.markChatRoomRead, { roomId });
}

async function listChatMessages(roomId: string): Promise<ChatMessage[]> {
  const messages = await getQuery<ChatMessage[]>(ENDPOINTS.listChatMessages, {
    roomId,
  });
  return Array.isArray(messages) ? messages : [];
}

function sendChatMessage(
  roomId: string,
  input: Omit<CreateChatMessageInput, "roomId">,
): Promise<ChatMessage> {
  return postApi<ChatMessage>(ENDPOINTS.sendChatMessage, { roomId, ...input });
}

function reactToChatMessage(
  roomId: string,
  messageId: string,
  emoji: string,
): Promise<ChatMessage> {
  return postApi<ChatMessage>(ENDPOINTS.reactToChatMessage, {
    roomId,
    messageId,
    emoji,
  });
}

function deleteChatMessage(
  roomId: string,
  messageId: string,
): Promise<{ ok: boolean }> {
  return postApi<{ ok: boolean }>(ENDPOINTS.deleteChatMessage, {
    roomId,
    messageId,
  });
}

export const api = {
  probe: probeApi,
  isOnline: () => availability === "online",
  getMe,
  login: (input: LoginInput) => postMutation<AuthUser>(ENDPOINTS.login, input),
  signup: (input: SignupInput) =>
    postMutation<AuthUser>(ENDPOINTS.signup, input),
  adminLogin: (input: LoginInput) =>
    postMutation<AuthUser>(ENDPOINTS.adminLogin, input),
  logout: postLogout,
  generateQuiz,
  listResources,
  getResource,
  createResource,
  removeResource,
  listLiveSessions,
  getLiveSession,
  createLiveSession,
  updateLiveSession,
  removeLiveSession,
  listSchemes,
  getScheme,
  importSchemes,
  setCurrentWeek,
  removeScheme,
  listAssignments,
  createAssignment,
  removeAssignment,
  requestPasswordReset,
  resetPassword,
  getSiteContent,
  updateSiteContent,
  publishSiteContent,
  revertSiteContent,
  uploadSiteImage,
  generateFromObjectives,
  getAdminOverview,
  listAdminUsers,
  setAdminUserRole,
  setAdminUserStatus,
  removeAdminUser,
  sendAdminUserReset,
  sendAdminUserEmail,
  listAdminClasses,
  createAdminClass,
  updateAdminClass,
  removeAdminClass,
  listAdminMessages,
  setAdminMessageStatus,
  listAdminSchools,
  decideAdminSchool,
  updateProfile,
  changePassword,
  submitContact,
  listChatContacts,
  openChatRoom,
  listChatRooms,
  markChatRoomRead,
  listChatMessages,
  sendChatMessage,
  reactToChatMessage,
  deleteChatMessage,
  uploadChatFile,
};
