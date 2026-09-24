export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  /** HS256 secret used to sign/verify session JWTs. Required for real sessions. */
  cookieSecret: process.env.JWT_SECRET ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /**
   * Model used for quiz & assessment generation. The app ships preconfigured
   * for Cerebras ("Celebras") — an OpenAI-compatible endpoint. Defaults to the
   * hosted `gpt-oss-120b`, which supports strict JSON-schema structured
   * outputs (see server/_core/llm.ts).
   */
  aiModel: process.env.AI_MODEL ?? "gpt-oss-120b",
  /** Admin inbox for contact-form & school-partnership messages. Defaults to
   *  the seeded admin email so nothing needs to be set for local testing. */
  contactNotifyEmail: process.env.CONTACT_NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? "",
  // Google OAuth (Sign in with Google). Client credentials from a Google Cloud
  // OAuth 2.0 web client. The callback URL must be registered as an authorized
  // redirect URI in the Google Cloud console.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  get googleConfigured(): boolean {
    return Boolean(this.googleClientId && this.googleClientSecret);
  },
  // Firebase (Cloud Firestore) via a service-account private key passed in .env…
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
  // …or via a path to the service-account JSON downloaded from the Firebase console.
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "",
  get firebaseConfigured(): boolean {
    return Boolean(
      (this.firebaseProjectId && this.firebaseClientEmail && this.firebasePrivateKey) ||
        this.firebaseServiceAccountPath ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS
    );
  },
  // Transactional email (password resets, notifications). Priority:
  // 1) Resend (RESEND_API_KEY) — the recommended provider for this app.
  // 2) Generic SMTP (SMTP_*) via nodemailer.
  // 3) Neither → "demo" mode returns reset links directly to the browser.
  //
  // With Resend, use a verified sender domain in the "from" address. If you
  // have not added a domain yet, `BrimLearn <onboarding@resend.dev>` is the
  // only sender allowed (it accepts the first 100 emails on a fresh account).
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailHost: process.env.SMTP_HOST ?? "",
  mailPort: Number(process.env.SMTP_PORT ?? "587"),
  mailSecure: process.env.SMTP_SECURE === "true",
  mailUser: process.env.SMTP_USER ?? "",
  mailPass: process.env.SMTP_PASS ?? "",
  /** Shared "from" used by Resend and SMTP (SMTP_FROM). */
  mailFrom: process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? "",
  get mailConfigured(): boolean {
    return Boolean(
      this.resendApiKey ||
        (this.mailHost && this.mailPort && this.mailUser && this.mailPass && this.mailFrom)
    );
  },
  // How long a password-reset link stays valid.
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? "30"),
};