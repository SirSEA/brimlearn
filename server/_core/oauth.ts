import {
  COOKIE_NAME,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE,
  SIGNUP_ROLES,
  decodeOAuthState,
  encodeOAuthState,
} from "@shared/const";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import type { User } from "@shared/user";
import * as db from "../db";
import { getSessionCookieOptions, isSecureRequest } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const GOOGLE_STATE_COOKIE_TTL_MS = 10 * 60 * 1000;

let googleJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getGoogleJwks() {
  if (!googleJwks) googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return googleJwks;
}

/** The `__Host-` prefix forces Secure; on plain http we use a plain name. */
function stateCookieName(secure: boolean): string {
  return secure ? OAUTH_STATE_COOKIE : "oauth_state";
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function safeRedirectPath(value: unknown): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

/** Mirrors client/src/lib/roles.ts roleHomePath so OAuth can land users on the right dashboard. */
function roleHomePath(role: string | undefined | null): string {
  switch (role) {
    case "parent":
      return "/parent";
    case "tutor":
      return "/tutor";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export function registerOAuthRoutes(app: Express) {
  // Tell the client whether "Sign in with Google" is wired up server-side.
  app.get("/api/oauth/google/config", (_req: Request, res: Response) => {
    res.json({ enabled: ENV.googleConfigured });
  });

  // ── Google Sign-in (Sign in with Google) ──────────────────────────────────
  app.get("/api/oauth/google/start", (req: Request, res: Response) => {
    if (!ENV.googleConfigured) {
      res.status(500).json({
        error:
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env and register the callback URL in Google Cloud.",
      });
      return;
    }

    const role = getQueryParam(req, "role");
    const requestedRole =
      typeof role === "string" && (SIGNUP_ROLES as readonly string[]).includes(role)
        ? role
        : "user";
    const redirectUri = safeRedirectPath(getQueryParam(req, "redirect") ?? "/");
    const nonce = randomBytes(16).toString("hex");
    const state = encodeOAuthState({ redirectUri, nonce, role: requestedRole });

    const secure = isSecureRequest(req);
    res.cookie(stateCookieName(secure), nonce, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      maxAge: GOOGLE_STATE_COOKIE_TTL_MS,
    });

    const callbackUrl = `${req.protocol}://${req.get("host")}/api/oauth/google/callback`;
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
      access_type: "online",
    });

    res.redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const stateRaw = getQueryParam(req, "state");

    if (!code || !stateRaw) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    if (!ENV.googleConfigured) {
      res.status(500).json({ error: "Google sign-in is not configured." });
      return;
    }

    const secure = isSecureRequest(req);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[stateCookieName(secure)];
    const state = decodeOAuthState(stateRaw);
    if (!state.nonce || state.nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(stateCookieName(secure), getSessionCookieOptions(req));

    try {
      const callbackUrl = `${req.protocol}://${req.get("host")}/api/oauth/google/callback`;
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResp.ok) {
        const detail = await tokenResp.text().catch(() => "");
        console.error(`[OAuth] Google token exchange failed (${tokenResp.status}): ${detail}`);
        res.status(502).json({ error: "Could not exchange the sign-in code with Google." });
        return;
      }

      const tokens = (await tokenResp.json()) as { id_token?: string };
      if (!tokens.id_token) {
        res.status(502).json({ error: "Google did not return an identity token." });
        return;
      }

      const { payload } = await jwtVerify(tokens.id_token, getGoogleJwks(), {
        audience: ENV.googleClientId,
        issuer: GOOGLE_ISSUERS,
      });

      const { sub, email, name, email_verified } = payload;
      if (typeof sub !== "string" || !sub) {
        res.status(400).json({ error: "Google response is missing the user subject." });
        return;
      }
      if (typeof email !== "string" || !email || email_verified !== true) {
        res.status(400).json({ error: "Please verify the email address on your Google account first." });
        return;
      }

      const openId = `google_${sub}`;
      const displayName = typeof name === "string" ? name : null;

      // Don't silently create a second account when this email already exists
      // as a password account (or vice-versa).
      const existing = await db.findUserByEmail(email);
      if (existing && existing.openId !== openId && existing.loginMethod === "email") {
        res.status(409).json({
          error: "An account already exists for this email. Sign in with your password instead.",
        });
        return;
      }

      const requestedRole = typeof state.role === "string" ? state.role : "";
      const proposedRole: NonNullable<User["role"]> =
        (SIGNUP_ROLES as readonly string[]).includes(requestedRole)
          ? (requestedRole as NonNullable<User["role"]>)
          : "user";
      const role = existing?.role ?? proposedRole;

      await db.upsertUser({
        openId,
        name: existing?.name ?? displayName,
        email,
        loginMethod: "google",
        role,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: displayName ?? "",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, roleHomePath(role));
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.status(500).json({ error: "Google sign-in failed." });
    }
  });
}