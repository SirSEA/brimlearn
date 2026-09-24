import {
  COOKIE_NAME,
  EMAIL_LOGIN_METHOD,
  NOT_ADMIN_ERR_MSG,
  ONE_YEAR_MS,
  RESOURCE_MAX_BASE64_CHARS,
  SCHEME_MAX_BASE64_CHARS,
  SCHEME_TOO_LARGE_MSG,
  RESOURCE_TOO_LARGE_MSG,
  SITE_IMAGE_MIME_TYPES,
  SITE_IMAGE_MAX_BASE64_CHARS,
  SITE_IMAGE_TOO_LARGE_MSG,
  SIGNUP_ROLES,
  UNAUTHED_ERR_MSG,
  USER_ROLES,
  USER_STATUSES,
} from "@shared/const";
import { CONTACT_TYPES, MESSAGE_STATUSES } from "@shared/message";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  protectedProcedure,
  router,
  tutorProcedure,
  adminProcedure,
} from "./_core/trpc";
import { hashPassword, verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { RESOURCE_CATEGORIES, RESOURCE_KINDS } from "@shared/resource";
import { LIVE_PLATFORMS, jitsiRoomUrl } from "@shared/session";
import { ASSIGNMENT_DIFFICULTIES, ASSIGNMENT_TYPES } from "@shared/assignment";
import type { AssessmentQuestion, QuestionType } from "@shared/assignment";
import { defaultLandingContent, SITE_CONTENT_DOC_ID } from "@shared/site";
import type { Scheme, SchemeWeek } from "@shared/scheme";
import { parseSchemePdf } from "./_core/schemeParser";
import {
  isMailConfigured,
  sendPasswordResetEmail,
  sendContactNotification,
  sendSchoolDecisionEmail,
  sendMail,
} from "./_core/email";
import { CHAT_MESSAGE_TYPES } from "@shared/chat";
import * as chatStore from "./_core/chat";
import { ENV } from "./_core/env";
import type { User } from "@shared/user";
import type { ClassGroup } from "@shared/class";
import type { School } from "@shared/school";
import { z } from "zod";
import type { IncomingMessage } from "node:http";
import type { TrpcContext } from "./_core/context";

/** Subjects where learners should actively do calculations, so the AI should
 *  mix in numeric/expression self-solve items rather than pure objectives. */
function isCalculationSubject(subject: string): boolean {
  const s = subject.toLowerCase();
  return [
    "mathematics",
    "math",
    "further math",
    "additional math",
    "statistics",
    "physics",
    "chemistry",
    "economics",
    "accounting",
    "technical drawing",
    "introduction to technology",
    "basic technology",
    "computer studies",
    "further mathematics",
  ].some((k) => s.includes(k));
}

/** Deterministic pseudo-random from a label so offline fallbacks vary per topic. */
function seedFor(text: string): number {
  let hash = 0;
  for (const char of text)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

/** Small printable arithmetic pair for offline self-calculation items. */
function arithmeticPair(text: string): {
  a: number;
  b: number;
  product: string;
} {
  const seed = seedFor(text);
  const a = 2 + (seed % 12);
  const b = 2 + ((seed >>> 3) % 12);
  return { a, b, product: String(a * b) };
}

/** Hardens whatever the LLM returned into a consistent AssessmentQuestion.
 *  Choice items keep an integer answer index; numeric/expression items store
 *  the canonical answer string. */
function normalizeAssessmentQuestions(raw: unknown): AssessmentQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): AssessmentQuestion | null => {
      if (!item || typeof item !== "object") return null;
      const q = item as Record<string, unknown>;
      const question = String(q.question ?? "").trim();
      if (!question) return null;
      const questionType: QuestionType =
        q.questionType === "numeric" || q.questionType === "expression"
          ? q.questionType
          : "choice";
      const options = Array.isArray(q.options)
        ? q.options.map(String).slice(0, 6)
        : [];
      const explanation = String(q.explanation ?? "").trim();
      const hint = q.hint != null ? String(q.hint).trim() || null : null;
      const unit = q.unit != null ? String(q.unit).trim() || null : null;
      const acceptedAnswers = Array.isArray(q.acceptedAnswers)
        ? q.acceptedAnswers.map(String).filter(Boolean).slice(0, 6)
        : [];

      if (questionType === "choice") {
        const index =
          typeof q.answer === "number"
            ? q.answer
            : parseInt(String(q.answer), 10);
        const safe =
          Number.isInteger(index) && index >= 0 && index < options.length
            ? index
            : 0;
        return {
          question,
          questionType,
          options,
          answer: safe,
          explanation,
          hint,
          unit,
        };
      }

      const answerString =
        typeof q.answerText === "string" && q.answerText.trim()
          ? q.answerText.trim()
          : typeof q.answer === "string" && q.answer.trim()
            ? q.answer.trim()
            : String(q.answer ?? "").trim();
      return {
        question,
        questionType,
        options: [],
        answer: answerString || "1",
        acceptedAnswers,
        hint,
        unit,
        explanation,
      };
    })
    .filter((q): q is AssessmentQuestion => q !== null);
}

function fallbackQuiz(topic: string, count: number, subject?: string) {
  const bank = [
    {
      question: `Which statement best describes ${topic}?`,
      options: [
        `It is a key idea in this topic`,
        "It is unrelated to the topic",
        "It is only used in history",
        "It cannot be practised",
      ],
      answer: 0,
      explanation: `${topic} is the focus of this practice set, so the first option identifies its role.`,
    },
    {
      question: `What is the best first step when practising ${topic}?`,
      options: [
        "Read the question carefully",
        "Skip every example",
        "Choose an answer at random",
        "Ignore the units",
      ],
      answer: 0,
      explanation:
        "Reading carefully helps you identify the information and operation the question requires.",
    },
    {
      question: `Which habit supports improvement in ${topic}?`,
      options: [
        "Explain your method",
        "Avoid checking work",
        "Copy without thinking",
        "Stop after one attempt",
      ],
      answer: 0,
      explanation:
        "Explaining a method makes reasoning visible and helps reveal misconceptions.",
    },
  ];
  const calculation =
    subject && isCalculationSubject(subject)
      ? [
          (() => {
            const { a, b, product } = arithmeticPair(topic);
            return {
              question: `Work it out by yourself: ${a} × ${b} = ?`,
              questionType: "numeric" as const,
              options: [],
              answer: product,
              hint: `Multiply ${a} by ${b}; show your working in a rough corner.`,
              explanation: `${a} × ${b} = ${product}. Writing the working down helps you catch small errors.`,
            };
          })(),
          {
            question: `Self-check: half of ${2 * (2 + (seedFor(topic) % 9))} is what?`,
            questionType: "numeric" as const,
            options: [],
            answer: String(2 + (seedFor(topic) % 9)),
            hint: "Halving is dividing by 2.",
            explanation: `Half of ${2 * (2 + (seedFor(topic) % 9))} is ${2 + (seedFor(topic) % 9)} because 2 × ${2 + (seedFor(topic) % 9)} = ${2 * (2 + (seedFor(topic) % 9))}.`,
          },
        ]
      : [];
  return {
    title: `${topic} practice set`,
    questions: [...bank, ...calculation].slice(
      0,
      Math.min(count, bank.length + calculation.length),
    ),
  };
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be at most 128 characters");

/** Best-effort public origin for building absolute links (reset emails). */
function appOrigin(req: IncomingMessage): string {
  const host = req.headers.host ?? "localhost:3001";
  if (host.includes("localhost") || host.includes("127.0.0.1"))
    return `http://${host}`;
  return `https://${host}`;
}

/** Public: https://
URL or a relative /site-images/… upload served by this app. */
const imageUrlField = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => /^https?:\/\//i.test(value) || value.startsWith("/site-images/"),
    "Use a public https:// URL or the site image upload.",
  )
  .optional()
  .nullable();

/** Landing-page content schema (admin-edited public site). */
const landingContentSchema = z.object({
  brand: z.object({
    name: z.string().trim().min(1).max(80),
    tagline: z.string().trim().max(140),
  }),
  hero: z.object({
    eyebrow: z.string().trim().max(140),
    headline: z.string().trim().min(1).max(160),
    subheadline: z.string().trim().max(400),
    imageUrl: imageUrlField,
    primaryCtaLabel: z.string().trim().max(40),
    primaryCtaHref: z.string().trim().max(200),
    secondaryCtaLabel: z.string().trim().max(40),
    secondaryCtaHref: z.string().trim().max(200),
  }),
  about: z.object({
    heading: z.string().trim().min(1).max(120),
    body: z.string().trim().max(800),
    imageUrl: imageUrlField,
  }),
  features: z
    .array(
      z.object({
        heading: z.string().trim().min(1).max(120),
        body: z.string().trim().max(500),
        imageUrl: imageUrlField,
      }),
    )
    .min(1)
    .max(8),
  courses: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        title: z.string().trim().min(1).max(160),
        description: z.string().trim().max(400),
        category: z.string().trim().max(80),
        platform: z.string().trim().max(80),
        url: z
          .string()
          .trim()
          .url("The course link must be a valid URL")
          .max(500),
        imageUrl: imageUrlField,
      }),
    )
    .max(40),
  cta: z.object({
    heading: z.string().trim().min(1).max(120),
    body: z.string().trim().max(400),
    buttonLabel: z.string().trim().max(40),
    buttonHref: z.string().trim().max(200),
  }),
  footer: z.object({
    tagline: z.string().trim().max(200),
    contactEmail: z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(120)
      .optional()
      .nullable(),
  }),
});

/** Deterministic quiz built from the scheme when AI generation is unavailable. */
function fallbackFromScheme(
  pattern: Scheme,
  weeks: SchemeWeek[],
  count: number,
  assessmentType: "quiz" | "assessment",
) {
  const bank: AssessmentQuestion[] = [];
  const used = weeks.slice(0, Math.max(1, Math.ceil(count / 3)));
  for (const week of used) {
    bank.push({
      question: `Which statement best describes the ${week.week} topic "${week.topic}"?`,
      options: [
        `It is the main idea explored in ${week.week}`,
        "It is unrelated to this scheme",
        "It is only tested at the very end of term",
        "It is a maths-only idea",
      ],
      answer: 0,
      explanation: `${week.topic} is the focus of ${week.week}. ${week.content ? week.content.slice(0, 140) : "Review the objectives above to confirm."}`,
    });
    bank.push({
      question: `What is the best first step when practising "${week.topic}"?`,
      options: [
        "Read the learning objectives first",
        "Skip the examples",
        "Memorise without practice",
        "Leave it until the exam",
      ],
      answer: 0,
      explanation:
        "Starting from the objectives keeps practice focused on what the scheme expects for the week.",
    });
    if (isCalculationSubject(pattern.subject)) {
      const { a, b, product } = arithmeticPair(week.topic);
      bank.push({
        question: `Self-calculation on ${week.topic}: work out ${a} × ${b} by hand = ?`,
        questionType: "numeric",
        options: [],
        answer: product,
        hint: `Set your working out clearly: ${a} × ${b}. Estimate first, then check.`,
        explanation: `${a} × ${b} = ${product}. Practising by hand builds the fluency ${week.topic} needs.`,
      });
    }
  }
  return {
    title: `${pattern.subject} ${assessmentType === "quiz" ? "quiz" : "assessment"} · from scheme of work`,
    questions: bank.slice(0, Math.min(count, bank.length)),
    suggestions: [
      "Start the lesson by reading the week's objectives aloud so learners know the target.",
      "Watch for learners who rush the first question — check they read the option text fully.",
      "Use the two lowest-scoring questions as a quick reteach, then re-issue with different numbers.",
      "Follow up with a 5-minute exit ticket written from the same objectives next lesson.",
      "Pair strong learners with those who struggled for a short peer-explain round.",
    ],
  };
}

/** JSON-safe projection of a user for the client. Dates are omitted (no superjson on the SPA). */
function projectUser(user: User) {
  return {
    id: String(user.id),
    openId: user.openId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    preferences: user.preferences,
    loginMethod: user.loginMethod,
    createdAt: user.createdAt.toISOString(),
    lastSignedIn: user.lastSignedIn.toISOString(),
  };
}

function dbUnavailableError(): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "The auth service is unavailable right now.",
  });
}

async function createSession(
  ctx: Pick<TrpcContext, "req" | "res">,
  user: User,
) {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "",
    expiresInMs: ONE_YEAR_MS,
  });
  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      return projectUser(user);
    }),
    signup: publicProcedure
      .input(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, "Name is required")
            .max(80, "Name is too long"),
          email: emailSchema,
          password: passwordSchema,
          role: z.enum(SIGNUP_ROLES),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (await db.doesEmailExist(input.email)) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "An account with this email already exists. Try signing in instead.",
          });
        }

        const { salt, hash } = hashPassword(input.password);
        const openId = `${EMAIL_LOGIN_METHOD}_${nanoid(24)}`;

        let user: User;
        try {
          user = await db.createEmailUser({
            openId,
            name: input.name,
            email: input.email,
            passwordHash: hash,
            passwordSalt: salt,
            role: input.role,
          });
        } catch (error) {
          console.error("[Auth] Signup failed", error);
          throw dbUnavailableError();
        }

        await createSession(ctx, user);
        return projectUser(user);
      }),
    login: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          password: z.string().min(1, "Password is required"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const user = await db.findUserByEmail(input.email);
        const isPasswordUser = user?.loginMethod === EMAIL_LOGIN_METHOD;

        if (!user || !isPasswordUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "No account found for that email. Please check it or sign up.",
          });
        }

        const valid = verifyPassword(
          input.password,
          user.passwordSalt,
          user.passwordHash,
        );
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: UNAUTHED_ERR_MSG,
          });
        }
        if (user.status === "suspended") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been suspended. Please contact support.",
          });
        }

        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await createSession(ctx, user);
        return projectUser(user);
      }),
    adminLogin: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          password: z.string().min(1, "Password is required"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const user = await db.findUserByEmail(input.email);
        const isPasswordUser = user?.loginMethod === EMAIL_LOGIN_METHOD;

        if (!user || !isPasswordUser || user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: NOT_ADMIN_ERR_MSG,
          });
        }

        const valid = verifyPassword(
          input.password,
          user.passwordSalt,
          user.passwordHash,
        );
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: UNAUTHED_ERR_MSG,
          });
        }
        if (user.status === "suspended") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been suspended. Please contact support.",
          });
        }

        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await createSession(ctx, user);
        return projectUser(user);
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: emailSchema }))
      .mutation(async ({ input, ctx }) => {
        // Always answer "ok" so callers can't tell which emails are registered.
        const user = await db.findUserByEmail(input.email);
        const isPasswordUser =
          user &&
          user.loginMethod === EMAIL_LOGIN_METHOD &&
          typeof user.passwordHash === "string" &&
          typeof user.passwordSalt === "string";

        const ttlMs = ENV.passwordResetTtlMinutes * 60_000;
        let resetUrl: string | null = null;

        if (isPasswordUser && user) {
          const token = await db.createPasswordReset(
            user.openId,
            input.email,
            ttlMs,
          );
          if (token) {
            const url = `${appOrigin(ctx.req)}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(input.email)}`;
            const delivered = await sendPasswordResetEmail(input.email, url);
            if (!delivered) resetUrl = url; // demo mode: hand the link back to the browser
          }
        }

        return {
          ok: true,
          demoMode: Boolean(resetUrl),
          resetUrl,
        } as const;
      }),
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().trim().min(8, "Reset token is missing").max(160),
          password: passwordSchema,
        }),
      )
      .mutation(async ({ input }) => {
        const row = await db.findPasswordReset(input.token);
        if (!row || row.used) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "This password reset link is invalid or has already been used.",
          });
        }
        if (row.expiresAt.getTime() < Date.now()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This password reset link has expired (links last ${ENV.passwordResetTtlMinutes} minutes). Request a new one.`,
          });
        }
        const user = await db.findUserByEmail(row.email);
        if (!user || user.loginMethod !== EMAIL_LOGIN_METHOD) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This password reset link is invalid for this account.",
          });
        }

        const { salt, hash } = hashPassword(input.password);
        await db.upsertUser({
          openId: user.openId,
          passwordHash: hash,
          passwordSalt: salt,
          lastSignedIn: new Date(),
        });
        await db.consumePasswordReset(input.token);
        return { ok: true } as const;
      }),
    /** Updates the signed-in user's public profile (shown across all roles). */
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, "Name is required")
            .max(80, "Name is too long")
            .optional(),
          email: emailSchema.optional(),
          preferences: z
            .object({ emailNotifications: z.boolean().optional() })
            .optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const current = ctx.user;
        const updates: db.UpsertUserInput = { openId: current.openId };

        if (input.name !== undefined) updates.name = input.name;

        if (input.email !== undefined) {
          if (current.loginMethod !== EMAIL_LOGIN_METHOD) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Email can only be changed on email/password accounts. You signed in with Google.",
            });
          }
          const normalized = input.email.toLowerCase();
          if (normalized !== current.email) {
            const taken = await db.findUserByEmail(normalized);
            if (taken && taken.openId !== current.openId) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "That email is already in use by another account.",
              });
            }
          }
          updates.email = normalized;
        }

        if (input.preferences !== undefined) {
          updates.preferences = {
            ...(current.preferences ?? {}),
            ...input.preferences,
          };
        }

        await db.upsertUser(updates);
        const updated = await db.getUserByOpenId(current.openId);
        if (!updated) throw dbUnavailableError();
        return projectUser(updated);
      }),
    /** Changes the password after verifying the current one. Email/password accounts only. */
    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1, "Current password is required"),
          newPassword: passwordSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.loginMethod !== EMAIL_LOGIN_METHOD) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Password changes only apply to email/password accounts.",
          });
        }
        const valid = verifyPassword(
          input.currentPassword,
          ctx.user.passwordSalt,
          ctx.user.passwordHash,
        );
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Your current password is incorrect.",
          });
        }
        const { salt, hash } = hashPassword(input.newPassword);
        await db.upsertUser({
          openId: ctx.user.openId,
          passwordHash: hash,
          passwordSalt: salt,
        });
        return { ok: true } as const;
      }),
  }),

  quiz: router({
    generate: publicProcedure
      .input(
        z.object({
          subject: z.string().min(1),
          grade: z.string().min(1),
          term: z.string().min(1),
          topic: z.string().min(1),
          count: z.number().int().min(3).max(8).default(5),
          difficulty: z
            .enum(["easy", "medium", "hard", "advanced"])
            .default("medium"),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const response = await Promise.race([
            invokeLLM({
              model: ENV.aiModel,
              messages: [
                {
                  role: "system",
                  content:
                    "You create accurate, age-appropriate Nigerian curriculum practice quizzes. Return JSON only. Mix question types so learners actually solve problems: for calculation subjects (mathematics, physics, chemistry, economics, accounting, technical drawing, computer studies) roughly half of your questions must be 'numeric' or 'expression' self-solve items where the learner works the answer out themselves with no answer options. Every question must have one unambiguous correct answer and a concise explanation. Do not mention that you are an AI.",
                },
                {
                  role: "user",
                  content: `Create ${input.count} practice questions for ${input.subject}, ${input.grade}, ${input.term}, topic: ${input.topic}. Difficulty: ${input.difficulty}. Easy means guided recall and one-step application; medium means balanced application with familiar examples; hard means two-step application and mild problem solving; advanced means multi-step reasoning, transferred contexts, and challenge items without exceeding the learner's grade. Use familiar examples and Nigerian/British English where appropriate. Keep each question under 180 characters and each explanation under 220 characters. ${isCalculationSubject(input.subject) ? "Make roughly half of the questions 'numeric' or 'expression' self-calculation items WITHOUT answer options, so the learner must do the working themselves; give the exact answer in answerText plus acceptedAnswers for equivalent forms (e.g. 0.5 and 1/2) and a hint and unit where useful. The other half should be classic four-option multiple choice." : "Make all questions classic four-option multiple choice."}`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "brimlearn_quiz",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            questionType: {
                              type: "string",
                              enum: ["choice", "numeric", "expression"],
                            },
                            options: {
                              type: "array",
                              items: { type: "string" },
                            },
                            answer: { type: "integer" },
                            answerText: { type: ["string", "null"] },
                            acceptedAnswers: {
                              type: "array",
                              items: { type: "string" },
                            },
                            hint: { type: ["string", "null"] },
                            unit: { type: ["string", "null"] },
                            explanation: { type: "string" },
                          },
                          required: [
                            "question",
                            "questionType",
                            "options",
                            "answer",
                            "answerText",
                            "acceptedAnswers",
                            "hint",
                            "unit",
                            "explanation",
                          ],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["title", "questions"],
                    additionalProperties: false,
                  },
                },
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("AI quiz timeout")), 18000),
            ),
          ]);
          const content = response.choices[0]?.message.content;
          const raw = Array.isArray(content)
            ? content.map((part) => ("text" in part ? part.text : "")).join("")
            : content;
          if (!raw)
            throw new Error("The quiz generator returned an empty response.");
          const parsed = JSON.parse(raw) as {
            title?: unknown;
            questions?: unknown;
          };
          return {
            title: String(parsed.title ?? `${input.topic} practice set`),
            questions: normalizeAssessmentQuestions(parsed.questions),
            context: input,
          };
        } catch (error) {
          console.warn(
            "[Quiz] AI generation unavailable, using safe fallback:",
            error instanceof Error ? error.message : error,
          );
          return {
            ...fallbackQuiz(input.topic, input.count, input.subject),
            context: input,
            fallback: true,
          };
        }
      }),

    generateFromObjectives: tutorProcedure
      .input(
        z.object({
          schemeId: z.string().trim().min(1),
          week: z.string().trim().max(40).optional().nullable(),
          assessmentType: z.enum(["quiz", "assessment"]),
          count: z.number().int().min(4).max(20).default(10),
          difficulty: z
            .enum(["easy", "medium", "hard", "advanced"])
            .default("medium"),
        }),
      )
      .mutation(async ({ input }) => {
        const scheme = await db.getScheme(input.schemeId);
        if (!scheme) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scheme of work not found.",
          });
        }

        const weeks = input.week
          ? scheme.weeks.filter(
              (w) =>
                w.week === input.week || w.week.includes(input.week as string),
            )
          : scheme.weeks.slice(0, 3);
        const objectives =
          weeks.length > 0
            ? weeks
                .map(
                  (w) =>
                    `• ${w.week}: ${w.topic}${w.content ? ` — ${w.content}` : ""}`,
                )
                .join("\n")
            : `No specific weekly objectives found; base the questions on ${scheme.subject} (${scheme.grade}, ${scheme.term}).`;

        try {
          const response = await Promise.race([
            invokeLLM({
              model: ENV.aiModel,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a Nigerian subject teacher who builds assessments straight from a scheme of work. Return JSON only. Base every question on the supplied topics, subtopics and learning objectives — never invent content outside them. Mix question types so learners actually solve problems: for calculation subjects (mathematics, physics, chemistry, economics, accounting, technical drawing, computer studies) roughly half of your questions must be 'numeric' or 'expression' self-solve items with no answer options, so the learner must do the calculation themselves. Questions must be accurate, age-appropriate, with one unambiguous correct answer and a concise explanation. Also return 3 to 5 short, practical suggestions for the teacher (common misconceptions, where to reteach, next steps). Do not mention that you are an AI.",
                },
                {
                  role: "user",
                  content: `Build a ${input.assessmentType} for ${scheme.subject} (${scheme.grade}, ${scheme.term}). Difficulty: ${input.difficulty}. Produce ${input.count} questions ONLY from these uploaded topics, subtopics and learning objectives:\n\n${objectives}\n\nEasy means guided recall and one-step application; medium means balanced application with familiar examples; hard means two-step application and mild problem solving; advanced means multi-step reasoning and transferred contexts. Use familiar examples and Nigerian/British English. Keep each question under 200 characters and each explanation under 240 characters. ${isCalculationSubject(scheme.subject) ? "Make roughly half of the questions 'numeric' or 'expression' self-calculation items WITHOUT answer options grounded in these objectives (e.g. solve, evaluate, find the value of, calculate the missing amount); give the exact answer in answerText plus acceptedAnswers for equivalent forms (e.g. 0.5 and 1/2) and a hint and unit where useful. The other half should be classic four-option multiple choice." : "Make all questions classic four-option multiple choice."}`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "brimlearn_assessment",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            questionType: {
                              type: "string",
                              enum: ["choice", "numeric", "expression"],
                            },
                            options: {
                              type: "array",
                              items: { type: "string" },
                            },
                            answer: { type: "integer" },
                            answerText: { type: ["string", "null"] },
                            acceptedAnswers: {
                              type: "array",
                              items: { type: "string" },
                            },
                            hint: { type: ["string", "null"] },
                            unit: { type: ["string", "null"] },
                            explanation: { type: "string" },
                          },
                          required: [
                            "question",
                            "questionType",
                            "options",
                            "answer",
                            "answerText",
                            "acceptedAnswers",
                            "hint",
                            "unit",
                            "explanation",
                          ],
                          additionalProperties: false,
                        },
                      },
                      suggestions: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["title", "questions", "suggestions"],
                    additionalProperties: false,
                  },
                },
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("AI assessment timeout")),
                22000,
              ),
            ),
          ]);

          const content = response.choices[0]?.message.content;
          const raw = Array.isArray(content)
            ? content.map((part) => ("text" in part ? part.text : "")).join("")
            : content;
          if (!raw) throw new Error("The assessor returned an empty response.");
          const parsed = JSON.parse(raw) as {
            title?: unknown;
            questions: AssessmentQuestion[];
            suggestions?: unknown;
          };
          return {
            title: String(
              parsed.title ?? `${scheme.subject} ${input.assessmentType}`,
            ),
            questions: normalizeAssessmentQuestions(parsed.questions),
            suggestions: Array.isArray(parsed.suggestions)
              ? parsed.suggestions.map(String).filter(Boolean).slice(0, 5)
              : [],
            context: {
              schemeId: input.schemeId,
              week: input.week ?? null,
              assessmentType: input.assessmentType,
              difficulty: input.difficulty,
            },
          };
        } catch (error) {
          console.warn(
            "[Quiz.AI] Assessment generation unavailable, using scheme fallback:",
            error instanceof Error ? error.message : error,
          );
          return {
            ...fallbackFromScheme(
              scheme,
              weeks,
              input.count,
              input.assessmentType,
            ),
            context: {
              schemeId: input.schemeId,
              week: input.week ?? null,
              assessmentType: input.assessmentType,
              difficulty: input.difficulty,
            },
            fallback: true,
          };
        }
      }),
  }),

  liveSessions: router({
    list: protectedProcedure.query(async () => {
      try {
        return await db.listLiveSessions();
      } catch (error) {
        console.error("[LiveSessions] list failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load live sessions right now.",
        });
      }
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        const session = await db.getLiveSession(input.id);
        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Live session not found.",
          });
        }
        return session;
      }),

    create: tutorProcedure
      .input(
        z
          .object({
            title: z
              .string()
              .trim()
              .min(1, "Give the session a title")
              .max(120, "Title is too long"),
            description: z
              .string()
              .trim()
              .max(500, "Description is too long")
              .default(""),
            grade: z.string().trim().max(80).optional().nullable(),
            subjectId: z.string().trim().max(80).optional().nullable(),
            subject: z.string().trim().max(80).optional().nullable(),
            term: z.string().trim().max(80).optional().nullable(),
            week: z.string().trim().max(80).optional().nullable(),
            platform: z.enum(LIVE_PLATFORMS),
            meetingUrl: z
              .string()
              .trim()
              .url("The meeting link must be a valid URL")
              .optional()
              .nullable(),
            meetingId: z.string().trim().max(80).optional().nullable(),
            passcode: z.string().trim().max(40).optional().nullable(),
            startsAt: z.string().min(1, "A start time is required"),
            endsAt: z.string().min(1, "An end time is required"),
          })
          .superRefine((data, ctx) => {
            const start = new Date(data.startsAt).getTime();
            const end = new Date(data.endsAt).getTime();
            if (Number.isNaN(start) || Number.isNaN(end)) {
              ctx.addIssue({
                code: "custom",
                path: ["startsAt"],
                message: "Times must be valid dates.",
              });
            } else if (end <= start) {
              ctx.addIssue({
                code: "custom",
                path: ["endsAt"],
                message: "The session must end after it starts.",
              });
            }
          }),
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid(18);
        return db.createLiveSession(
          {
            ...input,
            // In-app rooms are auto-hosted: everyone joins the same room built
            // from the session id, so no meetingUrl needs to be supplied.
            meetingUrl:
              input.meetingUrl ??
              (input.platform === "jitsi" ? jitsiRoomUrl(id) : null),
            hostBy: ctx.user.openId,
            hostName: ctx.user.name ?? null,
          },
          id,
        );
      }),

    update: tutorProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          title: z
            .string()
            .trim()
            .min(1, "Give the session a title")
            .max(120, "Title is too long")
            .optional(),
          description: z
            .string()
            .trim()
            .max(500, "Description is too long")
            .optional(),
          grade: z.string().trim().max(80).optional().nullable(),
          subjectId: z.string().trim().max(80).optional().nullable(),
          subject: z.string().trim().max(80).optional().nullable(),
          term: z.string().trim().max(80).optional().nullable(),
          week: z.string().trim().max(80).optional().nullable(),
          platform: z.enum(LIVE_PLATFORMS).optional(),
          meetingUrl: z
            .string()
            .trim()
            .url("The meeting link must be a valid URL")
            .optional()
            .nullable(),
          meetingId: z.string().trim().max(80).optional().nullable(),
          passcode: z.string().trim().max(40).optional().nullable(),
          startsAt: z.string().optional(),
          endsAt: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const session = await db.updateLiveSession(id, {
          ...updates,
          hostBy: ctx.user.openId,
          hostName: ctx.user.name ?? null,
        });
        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Live session not found.",
          });
        }
        return session;
      }),

    remove: tutorProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .mutation(async ({ input }) => {
        await db.deleteLiveSession(input.id);
        return { success: true } as const;
      }),
  }),

  schemes: router({
    list: protectedProcedure.query(async () => {
      try {
        return await db.listSchemes();
      } catch (error) {
        console.error("[Schemes] list failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load schemes of work right now.",
        });
      }
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        const scheme = await db.getScheme(input.id);
        if (!scheme) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scheme not found.",
          });
        }
        return scheme;
      }),

    import: adminProcedure
      .input(
        z.object({
          fileName: z
            .string()
            .trim()
            .min(1, "Give the PDF a file name")
            .max(160, "File name is too long"),
          mimeType: z.string().trim().max(100),
          dataBase64: z
            .string()
            .max(SCHEME_MAX_BASE64_CHARS, SCHEME_TOO_LARGE_MSG),
        }),
      )
      .mutation(async ({ input }) => {
        const parsed = await parseSchemePdf(input.dataBase64, input.fileName);
        if (parsed.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No scheme of work could be read from that PDF. Make sure it is a NERDC-style weekly plan.",
          });
        }
        return db.createSchemes(parsed);
      }),

    setCurrentWeek: tutorProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          week: z.string().trim().min(1, "Pick a week"),
        }),
      )
      .mutation(async ({ input }) => {
        const scheme = await db.updateSchemeCurrentWeek(input.id, input.week);
        if (!scheme) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scheme not found.",
          });
        }
        return scheme;
      }),

    remove: adminProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .mutation(async ({ input }) => {
        await db.deleteScheme(input.id);
        return { success: true } as const;
      }),
  }),

  resources: router({
    list: protectedProcedure.query(async () => {
      try {
        return await db.listResources();
      } catch (error) {
        console.error("[Resources] list failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load resources right now.",
        });
      }
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        const resource = await db.getResource(input.id);
        if (!resource) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Resource not found.",
          });
        }
        return resource;
      }),

    create: tutorProcedure
      .input(
        z
          .object({
            kind: z.enum(RESOURCE_KINDS),
            category: z.enum(RESOURCE_CATEGORIES),
            title: z
              .string()
              .trim()
              .min(1, "Give the resource a title")
              .max(120, "Title is too long"),
            description: z
              .string()
              .trim()
              .max(500, "Description is too long")
              .default(""),
            youtubeId: z
              .string()
              .trim()
              .regex(
                /^[A-Za-z0-9_-]{6,20}$/,
                "This YouTube link does not look valid",
              )
              .optional()
              .nullable(),
            fileName: z
              .string()
              .trim()
              .max(160, "File name is too long")
              .optional()
              .nullable(),
            mimeType: z.string().trim().max(100).optional().nullable(),
            grade: z.string().trim().max(80).optional().nullable(),
            subjectId: z.string().trim().max(80).optional().nullable(),
            subject: z.string().trim().max(80).optional().nullable(),
            term: z.string().trim().max(80).optional().nullable(),
            week: z.string().trim().max(80).optional().nullable(),
            dataBase64: z
              .string()
              .max(RESOURCE_MAX_BASE64_CHARS, RESOURCE_TOO_LARGE_MSG)
              .optional()
              .nullable(),
          })
          .superRefine((data, ctx) => {
            if (data.kind === "video") {
              if (!data.youtubeId) {
                ctx.addIssue({
                  code: "custom",
                  path: ["youtubeId"],
                  message: "A YouTube link is required for videos.",
                });
              }
              if (data.dataBase64) {
                ctx.addIssue({
                  code: "custom",
                  path: ["dataBase64"],
                  message:
                    "Videos are shared as YouTube links; remove the file payload.",
                });
              }
            } else if (!data.dataBase64 || !data.fileName) {
              ctx.addIssue({
                code: "custom",
                path: ["dataBase64"],
                message: "Select a file to publish.",
              });
            }
          }),
      )
      .mutation(async ({ input, ctx }) =>
        db.createResource({
          ...input,
          createdBy: ctx.user.openId,
          createdByName: ctx.user.name ?? null,
        }),
      ),

    remove: tutorProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .mutation(async ({ input }) => {
        await db.deleteResource(input.id);
        return { success: true } as const;
      }),
  }),

  assignments: router({
    list: protectedProcedure.query(async () => {
      try {
        return await db.listAssignments();
      } catch (error) {
        console.error("[Assignments] list failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load assignments right now.",
        });
      }
    }),

    create: tutorProcedure
      .input(
        z.object({
          type: z.enum(ASSIGNMENT_TYPES),
          title: z
            .string()
            .trim()
            .min(1, "Give the assignment a title")
            .max(120, "Title is too long"),
          subject: z
            .string()
            .trim()
            .min(1, "Pick a subject")
            .max(80, "Subject is too long"),
          audience: z.string().trim().max(160).default("Whole class"),
          audienceKey: z.enum(["class", "group", "individual"]),
          learnerIds: z.array(z.string().trim().min(1)).max(200).default([]),
          difficulty: z.enum(ASSIGNMENT_DIFFICULTIES),
          due: z.string().trim().max(120).optional().nullable(),
          questions: z
            .array(
              z.object({
                question: z.string().trim().min(1).max(400),
                options: z.array(z.string().trim().min(1).max(120)).length(4),
                answer: z.number().int().min(0).max(3),
                explanation: z.string().trim().max(400),
              }),
            )
            .max(20)
            .optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        db.createAssignment({
          ...input,
          due: input.due ?? null,
          createdBy: ctx.user.openId,
          createdByName: ctx.user.name ?? null,
        }),
      ),

    remove: tutorProcedure
      .input(z.object({ id: z.string().trim().min(1) }))
      .mutation(async ({ input }) => {
        await db.deleteAssignment(input.id);
        return { success: true } as const;
      }),
  }),

  site: router({
    /** Public landing-page content. Returns sensible defaults when unavailable. */
    get: publicProcedure.query(async () => {
      try {
        return await db.getSiteContent();
      } catch (error) {
        console.error("[Site] get failed", error);
        return {
          id: SITE_CONTENT_DOC_ID,
          status: "published",
          content: defaultLandingContent(),
          previous: null,
          version: 1,
          updatedAt: new Date().toISOString(),
          publishedAt: null,
          updatedByName: null,
        };
      }
    }),

    /** Stores an uploaded landing-page image and returns its public /site-images URL. */
    uploadImage: adminProcedure
      .input(
        z.object({
          fileName: z.string().trim().max(160, "File name is too long"),
          mimeType: z.enum(SITE_IMAGE_MIME_TYPES, {
            message: "Use a PNG, JPG, WebP, or GIF image.",
          }),
          dataBase64: z
            .string()
            .min(1, "The image data is missing")
            .max(SITE_IMAGE_MAX_BASE64_CHARS, SITE_IMAGE_TOO_LARGE_MSG),
        }),
      )
      .mutation(async ({ input }) => {
        const id = `site_${nanoid(16)}`;
        await db.saveSiteImage(id, input.mimeType, input.dataBase64);
        return { url: `/site-images/${id}`, id } as const;
      }),

    /** Saves edits to the working draft (does not publish). */
    update: adminProcedure
      .input(landingContentSchema)
      .mutation(async ({ input, ctx }) =>
        db.updateSiteContent(input, ctx.user.name ?? null),
      ),

    /** Copies the current draft to the live site and remembers the previous one. */
    publish: adminProcedure.mutation(async ({ ctx }) =>
      db.publishSiteContent(ctx.user.name ?? null),
    ),

    /** Rolls the working draft back to the last published version. */
    revert: adminProcedure.mutation(async ({ ctx }) =>
      db.revertSiteContent(ctx.user.name ?? null),
    ),
  }),

  /** Public "Contact us" form on the landing page. Writes to the Firestore
   *  `messages` inbox (shown on the admin Messages tab) and, when SMTP is
   *  configured, emails CONTACT_NOTIFY_EMAIL. School-type requests also create
   *  a `schools` doc for the admin to approve / reject on the Schools tab. */
  contact: router({
    submit: publicProcedure
      .input(
        z
          .object({
            type: z.enum(CONTACT_TYPES),
            name: z.string().trim().min(1, "Name is required").max(80),
            email: emailSchema,
            phone: z
              .string()
              .trim()
              .max(40)
              .optional()
              .nullable()
              .default(null),
            message: z
              .string()
              .trim()
              .min(10, "Please write a message of at least 10 characters")
              .max(2000),
            schoolName: z
              .string()
              .trim()
              .max(160)
              .optional()
              .nullable()
              .default(null),
            roleAtSchool: z
              .string()
              .trim()
              .max(80)
              .optional()
              .nullable()
              .default(null),
            learnerCount: z
              .string()
              .trim()
              .max(40)
              .optional()
              .nullable()
              .default(null),
          })
          .superRefine((data, ctx) => {
            if (data.type === "school" && !data.schoolName) {
              ctx.addIssue({
                code: "custom",
                path: ["schoolName"],
                message: "Add the school or organisation name.",
              });
            }
          }),
      )
      .mutation(async ({ input }) => {
        const message = await db.createContactMessage(input);

        let school: School | null = null;
        if (input.type === "school") {
          school = await db.upsertSchoolRequest({
            name: input.schoolName ?? input.name,
            contactName: input.name,
            contactEmail: input.email,
            phone: input.phone,
            learnerCount: input.learnerCount,
            messageId: message.id,
          });
        }

        const delivered = ENV.contactNotifyEmail
          ? await sendContactNotification(message)
          : false;

        return {
          ok: true,
          messageId: message.id,
          schoolId: school?.id ?? null,
          notified: delivered,
        } as const;
      }),
  }),

  chat: router({
    /** Everyone else on the platform — the address book for starting chats. */
    contacts: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await chatStore.listChatContacts(ctx.user.openId);
      } catch {
        return [];
      }
    }),

    rooms: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        try {
          return await chatStore.listRoomsForUser(ctx.user.openId);
        } catch {
          return [];
        }
      }),

      /** Opens (or finds) the direct conversation with another member. */
      open: protectedProcedure
        .input(z.object({ contactId: z.string().trim().min(1).max(200) }))
        .mutation(async ({ input, ctx }) => {
          const other = await db.getUserByOpenId(input.contactId);
          if (!other) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That member could not be found.",
            });
          }
          return chatStore.getOrCreateDirectRoom(
            { openId: ctx.user.openId, name: ctx.user.name },
            { openId: other.openId, name: other.name },
          );
        }),

      markRead: protectedProcedure
        .input(z.object({ roomId: z.string().trim().min(1) }))
        .mutation(async ({ input, ctx }) => {
          await chatStore.markRoomRead(input.roomId, ctx.user.openId);
          return { ok: true } as const;
        }),
    }),

    messages: router({
      list: protectedProcedure
        .input(z.object({ roomId: z.string().trim().min(1) }))
        .query(async ({ input }) => chatStore.listMessages(input.roomId)),

      send: protectedProcedure
        .input(
          z.object({
            roomId: z.string().trim().min(1),
            type: z.enum(CHAT_MESSAGE_TYPES),
            text: z
              .string()
              .max(4000, "Message is too long")
              .optional()
              .nullable()
              .default(null),
            mediaUrl: z.string().max(1000).optional().nullable().default(null),
            fileName: z.string().max(200).optional().nullable().default(null),
            fileSize: z
              .number()
              .int()
              .max(100_000_000)
              .optional()
              .nullable()
              .default(null),
            voiceDuration: z
              .number()
              .max(3_600)
              .optional()
              .nullable()
              .default(null),
            replyTo: z
              .object({
                id: z.string().min(1),
                senderName: z.string().max(120),
                text: z.string().max(4000).nullable(),
                type: z.enum(CHAT_MESSAGE_TYPES),
              })
              .optional()
              .nullable()
              .default(null),
          }),
        )
        .mutation(async ({ input, ctx }) =>
          chatStore.appendMessage(
            input.roomId,
            { openId: ctx.user.openId, name: ctx.user.name },
            input,
          ),
        ),

      /** Toggles a reaction (emoji) on a message for the caller. */
      react: protectedProcedure
        .input(
          z.object({
            roomId: z.string().trim().min(1),
            messageId: z.string().trim().min(1),
            emoji: z.string().min(1).max(8),
          }),
        )
        .mutation(async ({ input, ctx }) =>
          chatStore.toggleReaction(
            input.roomId,
            input.messageId,
            ctx.user.openId,
            input.emoji,
          ),
        ),

      delete: protectedProcedure
        .input(
          z.object({
            roomId: z.string().trim().min(1),
            messageId: z.string().trim().min(1),
          }),
        )
        .mutation(async ({ input, ctx }) =>
          chatStore.deleteMessage(
            input.roomId,
            input.messageId,
            ctx.user.openId,
            ctx.user.role === "admin",
          ),
        ),
    }),
  }),

  admin: router({
    /** Live counts across the workspace for the console landing tab. */
    overview: adminProcedure.query(async () => {
      try {
        return await db.getAdminOverview();
      } catch (error) {
        console.error("[Admin] overview failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load the admin overview right now.",
        });
      }
    }),

    users: router({
      /** Everyone with an account, newest first (no password data). */
      list: adminProcedure.query(async () => {
        try {
          return await db.listUsers();
        } catch (error) {
          console.error("[Admin] users.list failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not load users right now.",
          });
        }
      }),

      /** Promotes or demotes a user. The root owner cannot be demoted here. */
      setRole: adminProcedure
        .input(
          z.object({
            openId: z.string().trim().min(1),
            role: z.enum(USER_ROLES),
          }),
        )
        .mutation(async ({ input }) => {
          if (input.openId === ENV.ownerOpenId && input.role !== "admin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "The workspace owner always keeps the admin role (managed by OWNER_OPEN_ID).",
            });
          }
          const updated = await db.setUserRole(input.openId, input.role);
          if (!updated) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That user could not be found.",
            });
          }
          return updated;
        }),

      /** Suspends or reactivates an account. The owner cannot be suspended. */
      setStatus: adminProcedure
        .input(
          z.object({
            openId: z.string().trim().min(1),
            status: z.enum(USER_STATUSES),
          }),
        )
        .mutation(async ({ input }) => {
          if (
            input.openId === ENV.ownerOpenId &&
            input.status === "suspended"
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "The workspace owner cannot be suspended.",
            });
          }
          const updated = await db.setUserStatus(input.openId, input.status);
          if (!updated) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That user could not be found.",
            });
          }
          return updated;
        }),

      /** Sends a password-reset email on the user's behalf. Returns the link
       *  when SMTP is unconfigured (demo mode) so the admin can forward it. */
      sendResetEmail: adminProcedure
        .input(z.object({ openId: z.string().trim().min(1) }))
        .mutation(async ({ input, ctx }) => {
          const user = await db.getUserByOpenId(input.openId);
          if (!user || !user.email) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That user has no email address.",
            });
          }
          if (user.loginMethod !== EMAIL_LOGIN_METHOD || !user.passwordHash) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "This account uses Google sign-in and has no password to reset.",
            });
          }
          const ttlMs = ENV.passwordResetTtlMinutes * 60_000;
          const token = await db.createPasswordReset(
            user.openId,
            user.email,
            ttlMs,
          );
          if (!token) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not create a reset token right now.",
            });
          }
          const host = ctx.req.headers.host ?? "localhost:3001";
          const origin =
            host.includes("localhost") || host.includes("127.0.0.1")
              ? `http://${host}`
              : `https://${host}`;
          const url = `${origin}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
          const delivered = await sendPasswordResetEmail(user.email, url);
          return {
            ok: true,
            demoMode: !delivered,
            resetUrl: delivered ? null : url,
          } as const;
        }),

      /** Sends a message to a user via SMTP. Returns false when mail is off. */
      sendEmail: adminProcedure
        .input(
          z.object({
            openId: z.string().trim().min(1),
            subject: z.string().trim().min(1, "Add a subject").max(120),
            body: z.string().trim().min(1, "Write a message").max(4000),
          }),
        )
        .mutation(async ({ input }) => {
          const user = await db.getUserByOpenId(input.openId);
          if (!user || !user.email) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That user has no email address.",
            });
          }
          const delivered = await sendMail({
            to: user.email,
            subject: input.subject,
            text: input.body,
            html: `<p>${input.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`,
          });
          return { delivered } as const;
        }),

      /** Permanently deletes an account. Owner and your own account are protected. */
      remove: adminProcedure
        .input(z.object({ openId: z.string().trim().min(1) }))
        .mutation(async ({ input, ctx }) => {
          const currentUserId = String(ctx.user.id);
          if (currentUserId === input.openId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can't delete your own account from here.",
            });
          }
          const target = await db.getUserByOpenId(input.openId);
          if (!target) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found.",
            });
          }
          if (target.openId === ENV.ownerOpenId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "The workspace owner's account can't be deleted.",
            });
          }
          await db.deleteUser(input.openId);
          return { success: true } as const;
        }),
    }),

    classes: router({
      list: adminProcedure.query(async () => {
        try {
          return await db.listClasses();
        } catch (error) {
          console.error("[Admin] classes.list failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not load classes right now.",
          });
        }
      }),

      create: adminProcedure
        .input(
          z.object({
            name: z.string().trim().min(1, "Give the class a name").max(80),
            grade: z.string().trim().max(40).optional().nullable(),
            subject: z.string().trim().max(80).optional().nullable(),
            tutorId: z.string().trim().max(200).optional().nullable(),
            tutorName: z.string().trim().max(80).optional().nullable(),
            studentIds: z.array(z.string().trim().min(1)).max(500).default([]),
          }),
        )
        .mutation(async ({ input }) => db.createClass(input)),

      update: adminProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            name: z
              .string()
              .trim()
              .min(1, "Give the class a name")
              .max(80)
              .optional(),
            grade: z.string().trim().max(40).optional().nullable(),
            subject: z.string().trim().max(80).optional().nullable(),
            tutorId: z.string().trim().max(200).optional().nullable(),
            tutorName: z.string().trim().max(80).optional().nullable(),
            studentIds: z.array(z.string().trim().min(1)).max(500).optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          const group = await db.updateClass(id, updates);
          if (!group)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That class could not be found.",
            });
          return group;
        }),

      remove: adminProcedure
        .input(z.object({ id: z.string().trim().min(1) }))
        .mutation(async ({ input }) => {
          await db.deleteClass(input.id);
          return { success: true } as const;
        }),
    }),

    messages: router({
      list: adminProcedure.query(async () => {
        try {
          return await db.listMessages();
        } catch (error) {
          console.error("[Admin] messages.list failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not load messages right now.",
          });
        }
      }),

      setStatus: adminProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            status: z.enum(MESSAGE_STATUSES),
          }),
        )
        .mutation(async ({ input }) => {
          const message = await db.updateMessageStatus(input.id, input.status);
          if (!message)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That message could not be found.",
            });
          return message;
        }),
    }),

    schools: router({
      list: adminProcedure.query(async () => {
        try {
          return await db.listSchools();
        } catch (error) {
          console.error("[Admin] schools.list failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not load school requests right now.",
          });
        }
      }),

      /** Approves (issues an API key + emails it) or rejects a school request. */
      decide: adminProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            status: z.enum(["approved", "rejected"]),
          }),
        )
        .mutation(async ({ input }) => {
          const current = (await db.listSchools()).find(
            (school) => school.id === input.id,
          );
          if (!current)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That school request could not be found.",
            });
          if (current.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "This request was already decided.",
            });
          }
          // Generate a new key on first approval so it is not carried over from a rejected attempt.
          const apiKey =
            input.status === "approved" ? `brim_${nanoid(32)}` : null;
          const school = await db.decideSchool(input.id, input.status, apiKey);
          if (!school)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "That school request could not be found.",
            });
          await sendSchoolDecisionEmail(school, input.status === "approved");
          return school;
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
