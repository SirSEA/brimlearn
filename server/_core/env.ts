export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  /** HS256 secret used to sign/verify session JWTs. Required for real sessions. */
  cookieSecret: process.env.JWT_SECRET ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
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
};