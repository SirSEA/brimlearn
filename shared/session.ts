// Live (real-time) teaching sessions — the Zoom / Google Meet / Teams / etc.
// integrations. Teachers schedule a session and students join from the
// classroom tab. Pure module (no node deps) so client and server both import it.

export const LIVE_PLATFORMS = ["zoom", "google-meet", "teams", "other"] as const;
export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

export const LIVE_PLATFORM_LABELS: Record<LivePlatform, string> = {
  zoom: "Zoom",
  "google-meet": "Google Meet",
  teams: "Microsoft Teams",
  other: "Other link",
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