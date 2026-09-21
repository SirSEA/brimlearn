// Tutor-published learning resources (videos + files) shared with students.
// Pure module (no node deps) so the client and server can both import it.

export const RESOURCE_CATEGORIES = ["recording", "reading", "material", "worksheet"] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_KINDS = ["video", "file"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** JSON-safe resource document (what the client sends to / receives from the API). */
export type Resource = {
  id: string;
  kind: ResourceKind;
  category: ResourceCategory;
  title: string;
  description: string;
  /** Present when kind === "video". */
  youtubeId: string | null;
  /** Present when kind === "file". */
  fileName: string | null;
  mimeType: string | null;
  /** File size in bytes (0 for YouTube links). */
  size: number;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  /** Scheme context the resource hangs off (class/subject/term/week), used to
   *  group resources inside the classroom "weekly lessons" view. */
  grade: string | null;
  subjectId: string | null;
  subject: string | null;
  term: string | null;
  week: string | null;
};

/** resources.get returns the stored file payload too (used for download). */
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

/** Extracts a YouTube video id from a watch/shorts/embed link, or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const candidate = input.trim();
  if (!candidate) return null;
  if (/^[A-Za-z0-9_-]{6,20}$/.test(candidate)) return candidate;

  const patterns = [
    /(?:youtube\.com|youtu\.be)\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{6,20})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,20})/,
  ];
  for (const pattern of patterns) {
    const match = candidate.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Privacy-friendly embed URL used by the learner library player. */
export function buildYouTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
}

/** Makes an uploaded file name safe to store and download. */
export function sanitizeFileName(raw: string | null | undefined): string {
  const stripped = (raw ?? "").replace(/[^\w.\- ]+/g, "_").trim();
  return (stripped || "resource").slice(0, 120);
}