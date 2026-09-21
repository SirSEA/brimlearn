export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
export const NOT_TUTOR_ERR_MSG = 'Only tutors can publish resources (10003)';

// Resource files (PDFs, recorded clips) are stored inline as base64 in the
// Firestore document, so they must stay well under the 1 MiB document limit.
export const RESOURCE_MAX_BYTES = 512 * 1024;
export const RESOURCE_MAX_BASE64_CHARS = Math.ceil((RESOURCE_MAX_BYTES * 4) / 3) + 8;
export const RESOURCE_TOO_LARGE_MSG = 'Files must be 512 KB or smaller. For bigger videos or longer recordings, paste a YouTube link instead.';

// Scheme-of-work PDFs (NERDC weekly plans) parsed server-side. Generous cap:
// a full class/subject/term PDF is typically a few hundred KB.
export const SCHEME_MAX_BYTES = 12 * 1024 * 1024;
export const SCHEME_MAX_BASE64_CHARS = Math.ceil((SCHEME_MAX_BYTES * 4) / 3) + 8;
export const SCHEME_TOO_LARGE_MSG = 'Scheme-of-work PDFs must be 12 MB or smaller.';

/** Every product role the auth flow can assign. Shared by the DB schema and the client. */
export const USER_ROLES = ["user", "student", "parent", "tutor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles a visitor can self-register as on the shared signup screen. */
export const SIGNUP_ROLES = ["student", "parent", "tutor"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

/** Login method stored for email/password accounts (as opposed to OAuth platforms). */
export const EMAIL_LOGIN_METHOD = "email";

// One-time nonce cookie that binds an OAuth login to the browser that started
// it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no
// Domain), so a sibling *.manus.space site cannot plant a matching value in a
// victim's browser.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

// `state` carries the callback redirect URI (used at token exchange) plus the
// CSRF nonce. Defined here so the client encoder and server decoder never drift.
export type OAuthState = { redirectUri: string; nonce?: string; role?: string };

export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));

export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;
  try {
    decoded = atob(state);
  } catch {
    // Malformed base64 (e.g. attacker-supplied garbage). Return no nonce so the
    // callback's CSRF guard rejects it with 403 — never throw, since the caller
    // runs outside the request handler's try/catch.
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
    // Legacy links: `state` was a bare base64(redirectUri) with no nonce.
  }
  return { redirectUri: decoded };
};
