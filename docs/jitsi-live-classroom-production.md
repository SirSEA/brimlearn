# Jitsi live classroom — production wiring (JWT moderation + self-hosted)

This document explains how to move the live classroom from the **free public
`meet.jit.si` service** to a **self-hosted Jitsi Meet** server with **token-based
moderation**, so the teacher gets real host powers (lock the room, mute all,
kick learners) and learners join as guests.

Current state today:

| Concern | Now (demo/offline) | Production |
| --- | --- | --- |
| Video server | `meet.jit.si` (public, free) | Self-hosted Jitsi on a VPS |
| Auth / roles | No auth — first joiner is moderator | JWT token grants `moderator` |
| Recording, encryption, room lock | Free-tier limits, no guarantees | Configurable on your server |
| Iframe blocking / CSP | Works on `localhost` | Needs https + your domain allowlisted |

> **Why JWT only works self-hosted:** the public `meet.jit.si` service only
> verifies tokens signed with *their own* app ids. It never accepts your
> `JITSI_APP_SECRET`. Token-based moderation therefore requires running your
> own Jitsi Meet instance (a small Ubuntu VPS; see prerequisites below).
> Until then, keep `JITSI_JWT_MODERATION=false` and rooms work anonymously —
> the room name is already a random session id, so it's effectively
> "unreachable unless you know the room".

---

## 1. Prerequisites (the "what is required" bit)

- **A domain + TLS (https)**. The embedded iframe needs a secure context for
  camera/mic. Both your app and the Jitsi server must be https.
- **A Linux VPS** (2 vCPU / 4 GB RAM minimum for ~10 participants; more for
  larger classrooms) with Ubuntu 22.04 LTS and a public IP.
- **DNS records** pointing `meet.example.com` at the VPS (and
  `authenticate.meet.example.com` is created automatically by the installer).
- **Docker** optional — we recommend the official
  [Jitsi Meet **self-hosting** guide][jitsi-docker] (the `docker-jitsi-meet`
  compose stack). It handles turnserver, Prosody, and the web UI for you.

[jitsi-docker]: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker

### 2. What JWT moderation gives you

- `role: moderator` on the token → the teacher can start the meeting, lock the
  room, kick/mute participants.
- `role: guest/virtual-user` on learner tokens → normal participant (join,
  chat, raise-hand, request speak).
- Tokens are **signed and short-lived** (default 24 h), so no one can join a
  session without a real BrimLearn session for that room.
- Recording control can be toggled per-room via `configOverwrite`.

---

## 3. Configuration values (.env)

Add to your **production** `.env` (already documented in `.env.example`):

```dotenv
# Your own Jitsi server — NOT the public service when moderation is on
JITSI_DOMAIN=meet.example.com

# Turn on token-based roles
JITSI_JWT_MODERATION=true

# "JWT security" credentials from your Jitsi deployment
JITSI_APP_ID=brimlearn_app_id
JITSI_APP_SECRET=<64-char random secret>

# Room-name prefix (optional; must match BOTH sides)
JITSI_ROOM_PREFIX=brimlearn-
```

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> `JITSI_APP_ID` and `JITSI_APP_SECRET` must match what you configure in
> jitsi-meet's Prosody (`app-id` / `shared-secret`, see "JWT security" in the
> handbook). There is no other shared secret between BrimLearn and Jitsi.

---

## 4. Code changes

### 4.1 `server/_core/env.ts` — read the new settings

Add a `jitsi` block to the `ENV` object:

```ts
get jitsiDomain(): string {
  return process.env.JITSI_DOMAIN ?? "meet.jit.si";
},
jitsiAppId: process.env.JITSI_APP_ID ?? "",
jitsiAppSecret: process.env.JITSI_APP_SECRET ?? "",
jitsiJwtModeration: process.env.JITSI_JWT_MODERATION === "true",
jitsiRoomPrefix: process.env.JITSI_ROOM_PREFIX || "brimlearn-",
get jitsiModerationConfigured(): boolean {
  // Moderation is only possible against a self-hosted server with credentials.
  return Boolean(
    this.jitsiDomain !== "meet.jit.si" &&
      this.jitsiAppId &&
      this.jitsiAppSecret
  );
},
```

### 4.2 `shared/session.ts` — room helpers honour the prefix + token field

Change `jitsiRoomName` to use the configured prefix instead of a hardcoded one,
and add a per-session token field to `LiveSession`:

```ts
export type LiveSession = {
  // ... existing fields ...
  /** Signed Jitsi JWT (null when no moderation; moderator when the host asks). */
  token: string | null;
};

export function jitsiRoomName(sessionId: string, prefix = "brimlearn-"): string {
  const slug = sessionId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return `${prefix}${slug || Math.floor(Math.random() * 1_000_000_000)}`;
}

export function jitsiRoomUrl(sessionId: string, prefix = "brimlearn-"): string {
  return `https://meet.jit.si/${jitsiRoomName(sessionId, prefix)}`;
}
```

> `jitsiRoomUrl` keeps the *public* domain for downloads/fallback. When
> moderation is on, the client uses `ENV.jitsiDomain` (exposed via a new
> client-facing value, see 4.6).

### 4.3 `server/_core/jitsi.ts` (new file) — mint the token

```ts
import { createHmac } from "node:crypto";

/**
 * Signs the Jitsi "token auth" JWT (ASAP-format, HS256) per the Jitsi handbook:
 *   header:  { alg: "HS256", typ: "JWT", kid: "<appId>" }
 *   payload: { aud: "jitsi", iss: "chat", sub: "<domain>", room: "<room>",
 *              context.user: { id, name, email, moderator: "true" }, exp, nbf }
 */
export function signJitsiToken(opts: {
  appId: string;
  appSecret: string;
  domain: string;
  room: string;
  userId: string;
  userName: string;
  userEmail: string;
  moderator: boolean;
  ttlHours?: number;
}): string {
  const ttl = (opts.ttlHours ?? 24) * 3600;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT", kid: opts.appId };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: opts.domain,
    room: opts.room,
    context: {
      user: {
        id: opts.userId,
        name: opts.userName,
        email: opts.userEmail,
        moderator: opts.moderator ? "true" : "false",
      },
    },
    nbf: now,
    exp: now + ttl,
  };

  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = createHmac("sha256", opts.appSecret)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${signature}`;
}
```

### 4.4 `server/routers.ts` — sign a token per session

In `liveSessions.get` (and **before** returning from `create`), when
`ENV.jitsiModerationConfigured`, attach `token`:

```ts
get: protectedProcedure
  .input(z.object({ id: z.string().trim().min(1) }))
  .query(async ({ input, ctx }) => {
    const session = await db.getLiveSession(input.id);
    if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Live session not found." });

    if (ENV.jitsiModerationConfigured) {
      const isHost = session.hostBy === ctx.user.openId;
      return {
        ...session,
        token: signJitsiToken({
          appId: ENV.jitsiAppId,
          appSecret: ENV.jitsiAppSecret,
          domain: ENV.jitsiDomain,
          room: jitsiRoomName(session.id, ENV.jitsiRoomPrefix),
          userId: ctx.user.openId,
          userName: ctx.user.name ?? "Learner",
          userEmail: ctx.user.email ?? "", // must be verified email for moderation UI
          moderator: isHost,
        }),
      };
    }
    return { ...session, token: null };
  }),
```

Do the same inside `liveSessions.create` (the returning tutor is always the
host → `moderator: true`).

Update `ENV` usages: `ENV` is already imported in `routers.ts`.

### 4.5 `server/db.ts` — persist `token: null`

Add `token?: string | null` to `StoredLiveSession`, write `token: null` in
`createLiveSession`, and map it in `mapLiveSession`:

```ts
// in StoredLiveSession type
token?: string | null;
// in createLiveSession store
token: null,
// in mapLiveSession
token: typeof data.token === "string" ? data.token : null,
```

Tokens are **not** stored long-term — they are minted per read so they can be
short-lived. Storing `null` keeps the schema consistent.

### 4.6 Client — pass the domain, jwt and moderation flag

**a)** `client/src/_core/api.ts`: add two endpoints so the SPA knows the
configured domain/mode without hardcoding:

```ts
// ENDPOINTS
liveConfig: "/api/trpc/system.jitsiConfig", // or add a tiny protected query on liveSessions
```

Simplest: expose it through the existing `liveSessions.list` return by adding a
`public` flag on the router — or add a dedicated `jitsiConfig` public query in
`server/routers.ts`:

```ts
jitsiConfig: publicProcedure.query(() => ({
  domain: ENV.jitsiDomain,
  moderation: ENV.jitsiModerationConfigured,
  roomPrefix: ENV.jitsiRoomPrefix,
})),
```

**b)** `client/src/features/classroom/LiveRoom.tsx`: build the Jitsi options
with the domain and token:

```tsx
const config = await api.jitsiConfig();

const options = {
  roomName: jitsiRoomName(session.id, config.roomPrefix),
  parentNode: containerRef.current,
  width: "100%",
  height: "100%",
  lang: "en",
  userInfo: {
    displayName: displayName.trim() || (isHost ? "Teacher" : "Learner"),
    email: user?.email ?? "", // Optional but recommended for name badges
  },
  // Moderation on: hand over the signed token (host token → moderator powers)
  ...(config.moderation && session.token ? { jwt: session.token } : {}),
  configOverwrite: {
    startWithAudioMuted: !isHost,
    startWithVideoMuted: !isHost,
    prejoinConfig: { enabled: false },
    enableWelcomePage: false,
    liveStreamingEnabled: false,
    recordingEnabled: false,
    // Required so Jitsi trusts the role claim on the token:
    enableUserRolesBasedOnToken: config.moderation,
    disableBeforeUnloadHandler: true,
  },
  interfaceConfigOverwrite: {
    MOBILE_APP_PROMO: false,
    DEFAULT_BACKGROUND: "#0f2b22",
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
  },
};

const instance = new API(config.domain, options);
```

`LiveRoom` already receives `session.id`/`title`/`isHost`; add `session.token`
to the props threading from `ClassroomLive` / `TutorCalendar` (they already
pass the whole `LiveSession`-derived object).

### 4.7 `server/seed-content.ts` (demo rooms)

Demo rooms are created with `hostBy: "sample-seed"`, so no real user is the
host. When moderation is enabled, `refreshDemoLiveSessions` should mint a token
with `moderator: true` anyway so the seeded "live now" room stays joinable, or
simply stop self-healing demo rooms in production. Recommend:

```ts
// in refreshDemoLiveSessions(), guard the refresh:
if (ENV.isProduction) return; // real school data — never touch demo rooms
```

---

## 5. Jitsi server side (what to configure there)

With `docker-jitsi-meet`, after install you enable **authentication + JWT**:

1. `docker-compose.yml`
   ```yaml
   JWT_APP_ID: brimlearn_app_id
   JWT_APP_SECRET: <same secret as .env>
   JWT_ACCEPTED_ISSUERS: chat
   JWT_ACCEPTED_AUDIENCES: jitsi
   ```
2. Restart the stack:
   ```bash
   docker compose up -d
   docker compose exec jicofo prosodyctl mod_register_commands
   ```
3. Verify the jury:
   ```bash
   curl -s https://meet.example.com/about     # should 200
   ```
4. Test a token joins the room before wiring BrimLearn:
   ```bash
   node -e "..."  # use the token printer from test below
   open "https://meet.example.com/brimlearn-test#jwt=<token>"
   ```

### 6. Test checklist (BrimLearn side)

1. `npm run check` and `npm run build` pass after the code changes.
2. `.env` on the server has `JITSI_JWT_MODERATION=true` + the credentials.
3. With a tutor logged in → Tutor tab → Class calendar → "Start teaching" →
   you join the room and see `moderator` controls (lock, mute all).
4. With a learner logged in → Classroom tab → Join the same session → joins as
   guest, appears in the participant list **after** the host.
5. Learner attempts to lock/kick → no host buttons are visible.
6. Room is unresolvable by strangers (token-needed, random name) —
   `https://meet.example.com/<wrong-brimlearn-id>` shows "no permission".

---

## 7. Security notes

- Keep `JITSI_APP_SECRET` secret — anyone holding it can mint moderator tokens.
- Never ship the token generation to the client; it stays in `server/_core/jitsi.ts`.
- Keep `LiveSession.token` out of response payloads that are not `*`… the
  `list` procedure must **strip** the token: only `get`/`create` attach it.
- Use a **verified email** on users when moderation is on; audio/video
  moderation uses JWT `email` claims for identities.
- Rotate `JITSI_APP_SECRET` on the same cadence as `JWT_SECRET`.

---

## 8. Alternative (no self-hosted Jitsi yet)

If you want to keep `meet.jit.si` for a while, the only hardening available is:
- rely on the random session-id room names (already done), and
- accept "first joiner becomes moderator" as the host model,
- optionally set `interfaceConfigOverwrite.LOCK_FILE_...` and password lock
  rooms via `lockRoom`/`passwordRequired` (still anonymous though).

Move to the JWT/self-hosted path when the school has a server and domain — the
code above is the complete checklist.