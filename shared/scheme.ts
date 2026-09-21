// Scheme-of-work documents. A "scheme" is one class/subject/term's weekly
// plan (weeks[]), extracted server-side from an uploaded PDF (usually NERDC
// scheme of work) and stored (JSON-safe) in Cloud Firestore. Pure module so
// the client and server can both import it.

export const SCHEME_GRADES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;
export type SchemeGrade = (typeof SCHEME_GRADES)[number];

export const SCHEME_TERMS = ["First term", "Second term", "Third term"] as const;
export type SchemeTerm = (typeof SCHEME_TERMS)[number];

/** One week row inside a scheme of work. `topic` is a short heading and
 *  `content` holds the full cell text (objectives / breakdown). */
export type SchemeWeek = {
  week: string;
  topic: string;
  content: string;
};

/** JSON-safe scheme document (what the client sends to / receives from the API). */
export type Scheme = {
  id: string;
  grade: string;
  subjectId: string;
  /** Display name, e.g. "Mathematics" or "English Studies". */
  subject: string;
  term: string;
  weeks: SchemeWeek[];
  /** Original PDF file name the data was extracted from. */
  sourceFile: string | null;
  /** Week currently being taught (tutors can advance it). */
  currentWeek: string | null;
  importedAt: string;
  updatedAt: string;
};

/** Payload sent by the admin when uploading a scheme-of-work PDF. */
export type ImportSchemeInput = {
  fileName: string;
  mimeType: string;
  /** Raw PDF bytes, base64-encoded. Decoded and parsed server-side. */
  dataBase64: string;
};

/** Normalises a "JSS 1" / "SSS3" header token to a canonical grade id. */
export function normalizeGradeToken(token: string): string {
  const cleaned = token
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^SSS/, "SS");
  return cleaned;
}

/** Normalises a week cell ("11–13", "1 & 2", "7-8") to a canonical key. */
export function normalizeWeekToken(input: string): string {
  return input
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");
}