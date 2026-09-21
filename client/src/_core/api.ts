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
import type { LiveSession, CreateLiveSessionInput, UpdateLiveSessionInput } from "@shared/session";
import type { Scheme, ImportSchemeInput } from "@shared/scheme";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  loginMethod?: string | null;
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

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

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

export type ResourceCategory = "recording" | "reading" | "material" | "worksheet";
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
      res.status
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
  const res = await fetch(`${endpoint}?input=${param}`, { headers: requestOptions() });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new AuthError(
      extractErrorMessage(payload, `Request failed (${res.status})`),
      res.status
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
      res.status
    );
  }

  return unwrapData(await res.json()) as T;
}

async function listResources(): Promise<Resource[]> {
  const resources = await getQuery<Resource[]>(ENDPOINTS.listResources, {});
  return Array.isArray(resources) ? resources : [];
}

async function getResource(id: string): Promise<ResourceWithContent> {
  const resource = await getQuery<ResourceWithContent>(ENDPOINTS.getResource, { id });
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
  const sessions = await getQuery<LiveSession[]>(ENDPOINTS.listLiveSessions, {});
  return Array.isArray(sessions) ? sessions : [];
}

async function getLiveSession(id: string): Promise<LiveSession> {
  const session = await getQuery<LiveSession>(ENDPOINTS.getLiveSession, { id });
  if (!session || typeof session.id !== "string") {
    throw new ApiUnavailableError("Malformed live session response");
  }
  return session;
}

async function createLiveSession(input: CreateLiveSessionInput): Promise<LiveSession> {
  const session = await postApi<LiveSession>(ENDPOINTS.createLiveSession, input);
  if (!session || typeof session.id !== "string") {
    throw new ApiUnavailableError("Malformed live session response");
  }
  return session;
}

function updateLiveSession(id: string, input: UpdateLiveSessionInput): Promise<LiveSession> {
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
  if (!quiz || typeof quiz.title !== "string" || !Array.isArray(quiz.questions)) {
    throw new ApiUnavailableError("Malformed quiz response");
  }

  return {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      question: String(q.question ?? ""),
      options:
        Array.isArray(q.options) && q.options.length === 4
          ? q.options.map(String)
          : ["A", "B", "C", "D"],
      answer:
        typeof q.answer === "number" && q.answer >= 0 && q.answer <= 3
          ? q.answer
          : 0,
      explanation: String(q.explanation ?? ""),
    })),
  };
}

export const api = {
  probe: probeApi,
  isOnline: () => availability === "online",
  getMe,
  login: (input: LoginInput) => postMutation<AuthUser>(ENDPOINTS.login, input),
  signup: (input: SignupInput) => postMutation<AuthUser>(ENDPOINTS.signup, input),
  adminLogin: (input: LoginInput) => postMutation<AuthUser>(ENDPOINTS.adminLogin, input),
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
};