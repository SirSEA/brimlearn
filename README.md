# BrimLearn

A full-stack learning platform (learner / tutor / parent / admin dashboards) for NERDC-aligned maths and English practice. Express + tRPC + React (Vite) backend, Cloud Firestore for storage, and Google single sign-on.

## Stack

- **Server**: Node.js, Express, tRPC (superjson), jose (OAuth JWT), Firebase Admin
- **Client**: React 19, Vite, wouter, Tailwind CSS v4, lucide-react
- **Auth**: email/password + "Sign in with Google", httpOnly session cookies
- **Storage**: Cloud Firestore

## Local development

Prerequisites: Node.js >= 20 and npm.

```bash
cp .env.example .env        # then fill in the values below
npm install
npm run dev                 # http://localhost:3000 (falls back to 3001 if busy)
```

Required `.env` values (see `.env.example` for the full list and comments):

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs session tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth web-client credentials from Google Cloud. |
| Firebase credentials | Either a `FIREBASE_SERVICE_ACCOUNT_PATH` to the JSON (local), the three `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` fields (managed hosts), or `GOOGLE_APPLICATION_CREDENTIALS`. |

The service-account JSON and `.env` are git-ignored and must never be committed.

### Scripts

```bash
npm run dev      # develop (tsx watch, Vite HMR)
npm run check    # tsc --noEmit
npm run test     # vitest
npm run build    # bundle client + server into dist/
npm start        # run the production build (node dist/index.js)
npm run db:seed  # create the admin user (reads ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD env)
```

## Google sign-in setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type *Web application*.
2. Add these **Authorized redirect URIs**:
   - `http://localhost:3000/api/oauth/google/callback` — local development
   - `https://<your-host>/api/oauth/google/callback` — production
3. Paste the client ID and secret into `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

The server builds the callback URL from the incoming request, so the same
code works on any host as long as that host's callback URL is registered in
Google.

## Deploying

The app is a single Node process that serves both the API and the built
client, so deploy it as a web service (not static hosting).

### Render (recommended, free tier)

A ready-made blueprint is included:

1. Push this repo to GitHub.
2. In Render, **New → Blueprint** and select the repo. It reads `render.yaml`.
3. Paste the secret env vars in the dashboard (they are `sync: false`):
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and Firebase credentials
   (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` —
   put the private key on one line with `\n` escapes).
4. As soon as the service has a URL, register `https://<service>.onrender.com/api/oauth/google/callback` as an authorized redirect URI in Google Cloud, then test "Sign in with Google".

Or manually: add a new **Web Service**, build command `npm ci && npm run build`, start command `npm start`, health check path `/api/oauth/google/config`, and set the env vars above.

### Railway / Fly.io / any Node host

Same idea — build `npm run build`, start `npm start`, expose `PORT`, and set the same env vars. The server already trusts one proxy hop, so HTTPS and Secure cookies work behind their reverse proxies.

### What NOT to do

- Do not use static hosting that serves only `dist/public` (e.g. the old `netlify.toml`). Without the API, the app falls back to offline demo mode and Google sign-in cannot work.

## Architecture notes

- `client/src/components/layout/shell.ts` drives per-role navigation tabs (learner: Today / Grade book / Tracker / Classroom / Resource library / Messages; tutor: Student roster / Class calendar / Assignments / Virtual tool / Messages).
- Quiz and lesson content are differentiated by difficulty (`easy | medium | hard | advanced`); the server LLM call and per-learner assignment preview in the tutor "Assignments" tab both use these levels.
- Sessions are httpOnly cookies. Over HTTPS they are `Secure` + `SameSite=None`; over local http they are `Lax` (a plain `SameSite=None` cookie without `Secure` is silently dropped by browsers).