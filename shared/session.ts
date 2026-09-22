// Live (real-time) teaching sessions — the Zoom / Google Meet / Teams / etc.
// integrations. Teachers schedule a session and students join from the
// classroom tab. Pure module (no node deps) so client and server both import it.

export const LIVE_PLATFORMS = ["zoom", "google-meet", "teams", "other", "jitsi"] as const;
export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

export const LIVE_PLATFORM_LABELS: Record<LivePlatform, string> = {
  zoom: "Zoom",
  "google-meet": "Google Meet",
  teams: "Microsoft Teams",
  other: "Other link",
  jitsi: "BrimLearn Live",
};

/** JSON-safe live session document. */
export type LiveSession = {
  id: string;
  title: string;
  description: string;
  /** Optional scheme context so a session can hang off a specific class/week. */
  grade: string | null;
  subjectId: string | null;
  subject: string | null;
  term: string | null;
  week: string | null;
  platform: LivePlatform;
  /** Join link (Zoom URL, Meet URL, custom link). */
  meetingUrl: string | null;
  /** Meeting id / code shown for platforms that need one. */
  meetingId: string | null;
  passcode: string | null;
  /** ISO timestamps. */
  startsAt: string;
  endsAt: string;
  hostBy: string;
  hostName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLiveSessionInput = {
  title: string;
  description?: string;
  grade?: string | null;
  subjectId?: string | null;
  subject?: string | null;
  term?: string | null;
  week?: string | null;
  platform: LivePlatform;
  meetingUrl?: string | null;
  meetingId?: string | null;
  passcode?: string | null;
  startsAt: string;
  endsAt: string;
};

export type UpdateLiveSessionInput = Partial<CreateLiveSessionInput>;

/** Status bucket computed from the current time, used only by the client. */
export type LiveSessionStatus = "upcoming" | "live" | "ended";

export function sessionStatus(session: LiveSession, now = Date.now()): LiveSessionStatus {
  const start = new Date(session.startsAt).getTime();
  const end = new Date(session.endsAt).getTime();
  if (now < start) return "upcoming";
  if (now >= start && now < end) return "live";
  return "ended";
}

/** Builds the safe join URL. Returns null when the session has no link. */
export function sessionJoinUrl(session: LiveSession): string | null {
  if (session.meetingUrl && /^https?:\/\//i.test(session.meetingUrl)) return session.meetingUrl;
  return null;
}

/**
 * Stable Jitsi room name for a session. Pure and deterministic so the server
 * (when scheduling) and every client (when joining) resolve to the same room
 * from the session id alone.
 */
export function jitsiRoomName(sessionId: string): string {
  const slug = sessionId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return `brimlearn-${slug || Math.floor(Math.random() * 1_000_000_000)}`;
}

/** Full URL embedded by the in-app room (meet.jit.si public service). */
export function jitsiRoomUrl(sessionId: string): string {
  return `https://meet.jit.si/${jitsiRoomName(sessionId)}`;
}

/** True when the session runs inside the app's embedded room (Jitsi). */
export function isEmbeddedRoom(session: Pick<LiveSession, "platform" | "meetingUrl">): boolean {
  if (session.platform === "jitsi") return true;
  return Boolean(session.meetingUrl && /meet\.jit\.si\//i.test(session.meetingUrl));
}