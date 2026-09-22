import { COOKIE_NAME, EMAIL_LOGIN_METHOD, NOT_ADMIN_ERR_MSG, ONE_YEAR_MS, RESOURCE_MAX_BASE64_CHARS, SCHEME_MAX_BASE64_CHARS, SCHEME_TOO_LARGE_MSG, RESOURCE_TOO_LARGE_MSG, SIGNUP_ROLES, UNAUTHED_ERR_MSG } from "@shared/const";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, tutorProcedure, adminProcedure } from "./_core/trpc";
import { hashPassword, verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { RESOURCE_CATEGORIES, RESOURCE_KINDS } from "@shared/resource";
import { LIVE_PLATFORMS, jitsiRoomUrl } from "@shared/session";
import { ASSIGNMENT_DIFFICULTIES, ASSIGNMENT_TYPES } from "@shared/assignment";
import type { AssessmentQuestion } from "@shared/assignment";
import { defaultLandingContent, SITE_CONTENT_DOC_ID } from "@shared/site";
import type { Scheme, SchemeWeek } from "@shared/scheme";
import { parseSchemePdf } from "./_core/schemeParser";
import { isMailConfigured, sendPasswordResetEmail } from "./_core/email";
import { ENV } from "./_core/env";
import type { User } from "@shared/user";
import { z } from "zod";
import type { IncomingMessage } from "node:http";
import type { TrpcContext } from "./_core/context";

function fallbackQuiz(topic: string, count: number) {
  const bank = [
    { question: `Which statement best describes ${topic}?`, options: [`It is a key idea in this topic`, "It is unrelated to the topic", "It is only used in history", "It cannot be practised"], answer: 0, explanation: `${topic} is the focus of this practice set, so the first option identifies its role.` },
    { question: `What is the best first step when practising ${topic}?`, options: ["Read the question carefully", "Skip every example", "Choose an answer at random", "Ignore the units"], answer: 0, explanation: "Reading carefully helps you identify the information and operation the question requires." },
    { question: `Which habit supports improvement in ${topic}?`, options: ["Explain your method", "Avoid checking work", "Copy without thinking", "Stop after one attempt"], answer: 0, explanation: "Explaining a method makes reasoning visible and helps reveal misconceptions." },
  ];
  return { title: `${topic} practice set`, questions: bank.slice(0, Math.min(count, bank.length)) };
}

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(128, "Password must be at most 128 characters");

/** Best-effort public origin for building absolute links (reset emails). */
function appOrigin(req: IncomingMessage): string {
  const host = req.headers.host ?? "localhost:3001";
  if (host.includes("localhost") || host.includes("127.0.0.1")) return `http://${host}`;
  return `https://${host}`;
}

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
    imageUrl: z.string().trim().url("The hero image must be a valid URL").max(500).optional().nullable(),
    primaryCtaLabel: z.string().trim().max(40),
    primaryCtaHref: z.string().trim().max(200),
    secondaryCtaLabel: z.string().trim().max(40),
    secondaryCtaHref: z.string().trim().max(200),
  }),
  about: z.object({
    heading: z.string().trim().min(1).max(120),
    body: z.string().trim().max(800),
    imageUrl: z.string().trim().url("The image must be a valid URL").max(500).optional().nullable(),
  }),
  features: z
    .array(
      z.object({
        heading: z.string().trim().min(1).max(120),
        body: z.string().trim().max(500),
        imageUrl: z.string().trim().url("The image must be a valid URL").max(500).optional().nullable(),
      })
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
        url: z.string().trim().url("The course link must be a valid URL").max(500),
        imageUrl: z.string().trim().url("The image must be a valid URL").max(500).optional().nullable(),
      })
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
    contactEmail: z.string().trim().email("Enter a valid email").max(120).optional().nullable(),
  }),
});

/** Deterministic quiz built from the scheme when AI generation is unavailable. */
function fallbackFromScheme(pattern: Scheme, weeks: SchemeWeek[], count: number, assessmentType: "quiz" | "assessment") {
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
      options: ["Read the learning objectives first", "Skip the examples", "Memorise without practice", "Leave it until the exam"],
      answer: 0,
      explanation: "Starting from the objectives keeps practice focused on what the scheme expects for the week.",
    });
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
    loginMethod: user.loginMethod,
  };
}

function dbUnavailableError(): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "The auth service is unavailable right now.",
  });
}

async function createSession(ctx: Pick<TrpcContext, "req" | "res">, user: User) {
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
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      return projectUser(user);
    }),
    signup: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
          email: emailSchema,
          password: passwordSchema,
          role: z.enum(SIGNUP_ROLES),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (await db.doesEmailExist(input.email)) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Try signing in instead." });
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
      .input(z.object({ email: emailSchema, password: z.string().min(1, "Password is required") }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.findUserByEmail(input.email);
        const isPasswordUser = user?.loginMethod === EMAIL_LOGIN_METHOD;

        if (!user || !isPasswordUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "No account found for that email. Please check it or sign up." });
        }

        const valid = verifyPassword(input.password, user.passwordSalt, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
        }

        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await createSession(ctx, user);
        return projectUser(user);
      }),
    adminLogin: publicProcedure
      .input(z.object({ email: emailSchema, password: z.string().min(1, "Password is required") }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.findUserByEmail(input.email);
        const isPasswordUser = user?.loginMethod === EMAIL_LOGIN_METHOD;

        if (!user || !isPasswordUser || user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }

        const valid = verifyPassword(input.password, user.passwordSalt, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
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
          const token = await db.createPasswordReset(user.openId, input.email, ttlMs);
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
      .input(z.object({ token: z.string().trim().min(8, "Reset token is missing").max(160), password: passwordSchema }))
      .mutation(async ({ input }) => {
        const row = await db.findPasswordReset(input.token);
        if (!row || row.used) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "This password reset link is invalid or has already been used." });
        }
        if (row.expiresAt.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `This password reset link has expired (links last ${ENV.passwordResetTtlMinutes} minutes). Request a new one.` });
        }
        const user = await db.findUserByEmail(row.email);
        if (!user || user.loginMethod !== EMAIL_LOGIN_METHOD) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "This password reset link is invalid for this account." });
        }

        const { salt, hash } = hashPassword(input.password);
        await db.upsertUser({ openId: user.openId, passwordHash: hash, passwordSalt: salt, lastSignedIn: new Date() });
        await db.consumePasswordReset(input.token);
        return { ok: true } as const;
      }),
  }),

  quiz: router({
    generate: publicProcedure
      .input(z.object({ subject: z.string().min(1), grade: z.string().min(1), term: z.string().min(1), topic: z.string().min(1), count: z.number().int().min(3).max(8).default(5), difficulty: z.enum(["easy", "medium", "hard", "advanced"]).default("medium") }))
      .mutation(async ({ input }) => {
        try {
          const response = await Promise.race([invokeLLM({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: "You create accurate, age-appropriate Nigerian curriculum practice quizzes. Return JSON only. Every question must have one unambiguous correct answer, four options, and a concise explanation. Do not mention that you are an AI." },
            { role: "user", content: `Create ${input.count} multiple-choice practice questions for ${input.subject}, ${input.grade}, ${input.term}, topic: ${input.topic}. Difficulty: ${input.difficulty}. Easy means guided recall and one-step application; medium means balanced application with familiar examples; hard means two-step application and mild problem solving; advanced means multi-step reasoning, transferred contexts, and challenge items without exceeding the learner's grade. Use familiar examples and Nigerian/British English where appropriate. Keep each question under 180 characters and each explanation under 220 characters.` },
          ],
          reasoning: { effort: "low" },
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
                        options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                        answer: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "answer", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "questions"],
                additionalProperties: false,
              },
            },
          },
          }), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI quiz timeout")), 18000))]);
          const content = response.choices[0]?.message.content;
          const raw = Array.isArray(content) ? content.map((part) => "text" in part ? part.text : "").join("") : content;
          if (!raw) throw new Error("The quiz generator returned an empty response.");
          return { ...JSON.parse(raw), context: input };
        } catch (error) {
          console.warn("[Quiz] AI generation unavailable, using safe fallback:", error instanceof Error ? error.message : error);
          return { ...fallbackQuiz(input.topic, input.count), context: input, fallback: true };
        }
      }),

    generateFromObjectives: tutorProcedure
      .input(
        z.object({
          schemeId: z.string().trim().min(1),
          week: z.string().trim().max(40).optional().nullable(),
          assessmentType: z.enum(["quiz", "assessment"]),
          count: z.number().int().min(4).max(20).default(10),
          difficulty: z.enum(["easy", "medium", "hard", "advanced"]).default("medium"),
        })
      )
      .mutation(async ({ input }) => {
        const scheme = await db.getScheme(input.schemeId);
        if (!scheme) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scheme of work not found." });
        }

        const weeks = input.week
          ? scheme.weeks.filter((w) => w.week === input.week || w.week.includes(input.week as string))
          : scheme.weeks.slice(0, 3);
        const objectives =
          weeks.length > 0
            ? weeks.map((w) => `• ${w.week}: ${w.topic}${w.content ? ` — ${w.content}` : ""}`).join("\n")
            : `No specific weekly objectives found; base the questions on ${scheme.subject} (${scheme.grade}, ${scheme.term}).`;

        try {
          const response = await Promise.race([invokeLLM({
            model: "gpt-5-mini",
            messages: [
              { role: "system", content: "You are a Nigerian subject teacher who builds assessments straight from a scheme of work. Return JSON only. Base every question on the supplied topics, subtopics and learning objectives — never invent content outside them. Questions must be accurate, age-appropriate, with one unambiguous correct answer, four options, and a concise explanation. Also return 3 to 5 short, practical suggestions for the teacher (common misconceptions, where to reteach, next steps). Do not mention that you are an AI." },
              { role: "user", content: `Build a ${input.assessmentType} for ${scheme.subject} (${scheme.grade}, ${scheme.term}). Difficulty: ${input.difficulty}. Produce ${input.count} multiple-choice questions ONLY from these uploaded topics, subtopics and learning objectives:\n\n${objectives}\n\nEasy means guided recall and one-step application; medium means balanced application with familiar examples; hard means two-step application and mild problem solving; advanced means multi-step reasoning and transferred contexts. Use familiar examples and Nigerian/British English. Keep each question under 200 characters and each explanation under 240 characters.` },
            ],
            reasoning: { effort: "low" },
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
                          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                          answer: { type: "integer", minimum: 0, maximum: 3 },
                          explanation: { type: "string" },
                        },
                        required: ["question", "options", "answer", "explanation"],
                        additionalProperties: false,
                      },
                    },
                    suggestions: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "questions", "suggestions"],
                  additionalProperties: false,
                },
              },
            },
          }), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI assessment timeout")), 22000))]);

          const content = response.choices[0]?.message.content;
          const raw = Array.isArray(content) ? content.map((part) => ("text" in part ? part.text : "")).join("") : content;
          if (!raw) throw new Error("The assessor returned an empty response.");
          const parsed = JSON.parse(raw) as { title: string; questions: AssessmentQuestion[]; suggestions: string[] };
          return {
            ...parsed,
            context: { schemeId: input.schemeId, week: input.week ?? null, assessmentType: input.assessmentType, difficulty: input.difficulty },
          };
        } catch (error) {
          console.warn("[Quiz.AI] Assessment generation unavailable, using scheme fallback:", error instanceof Error ? error.message : error);
          return {
            ...fallbackFromScheme(scheme, weeks, input.count, input.assessmentType),
            context: { schemeId: input.schemeId, week: input.week ?? null, assessmentType: input.assessmentType, difficulty: input.difficulty },
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Live session not found." });
        }
        return session;
      }),

    create: tutorProcedure
      .input(
        z
          .object({
            title: z.string().trim().min(1, "Give the session a title").max(120, "Title is too long"),
            description: z.string().trim().max(500, "Description is too long").default(""),
            grade: z.string().trim().max(80).optional().nullable(),
            subjectId: z.string().trim().max(80).optional().nullable(),
            subject: z.string().trim().max(80).optional().nullable(),
            term: z.string().trim().max(80).optional().nullable(),
            week: z.string().trim().max(80).optional().nullable(),
            platform: z.enum(LIVE_PLATFORMS),
            meetingUrl: z.string().trim().url("The meeting link must be a valid URL").optional().nullable(),
            meetingId: z.string().trim().max(80).optional().nullable(),
            passcode: z.string().trim().max(40).optional().nullable(),
            startsAt: z.string().min(1, "A start time is required"),
            endsAt: z.string().min(1, "An end time is required"),
          })
          .superRefine((data, ctx) => {
            const start = new Date(data.startsAt).getTime();
            const end = new Date(data.endsAt).getTime();
            if (Number.isNaN(start) || Number.isNaN(end)) {
              ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Times must be valid dates." });
            } else if (end <= start) {
              ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The session must end after it starts." });
            }
          })
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid(18);
        return db.createLiveSession(
          {
            ...input,
            // In-app rooms are auto-hosted: everyone joins the same room built
            // from the session id, so no meetingUrl needs to be supplied.
            meetingUrl: input.meetingUrl ?? (input.platform === "jitsi" ? jitsiRoomUrl(id) : null),
            hostBy: ctx.user.openId,
            hostName: ctx.user.name ?? null,
          },
          id
        );
      }),

    update: tutorProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          title: z.string().trim().min(1, "Give the session a title").max(120, "Title is too long").optional(),
          description: z.string().trim().max(500, "Description is too long").optional(),
          grade: z.string().trim().max(80).optional().nullable(),
          subjectId: z.string().trim().max(80).optional().nullable(),
          subject: z.string().trim().max(80).optional().nullable(),
          term: z.string().trim().max(80).optional().nullable(),
          week: z.string().trim().max(80).optional().nullable(),
          platform: z.enum(LIVE_PLATFORMS).optional(),
          meetingUrl: z.string().trim().url("The meeting link must be a valid URL").optional().nullable(),
          meetingId: z.string().trim().max(80).optional().nullable(),
          passcode: z.string().trim().max(40).optional().nullable(),
          startsAt: z.string().optional(),
          endsAt: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const session = await db.updateLiveSession(id, {
          ...updates,
          hostBy: ctx.user.openId,
          hostName: ctx.user.name ?? null,
        });
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Live session not found." });
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Scheme not found." });
        }
        return scheme;
      }),

    import: adminProcedure
      .input(
        z.object({
          fileName: z.string().trim().min(1, "Give the PDF a file name").max(160, "File name is too long"),
          mimeType: z.string().trim().max(100),
          dataBase64: z.string().max(SCHEME_MAX_BASE64_CHARS, SCHEME_TOO_LARGE_MSG),
        })
      )
      .mutation(async ({ input }) => {
        const parsed = await parseSchemePdf(input.dataBase64, input.fileName);
        if (parsed.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No scheme of work could be read from that PDF. Make sure it is a NERDC-style weekly plan.",
          });
        }
        return db.createSchemes(parsed);
      }),

    setCurrentWeek: tutorProcedure
      .input(z.object({ id: z.string().trim().min(1), week: z.string().trim().min(1, "Pick a week") }))
      .mutation(async ({ input }) => {
        const scheme = await db.updateSchemeCurrentWeek(input.id, input.week);
        if (!scheme) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scheme not found." });
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
        }
        return resource;
      }),

    create: tutorProcedure
      .input(
        z
          .object({
            kind: z.enum(RESOURCE_KINDS),
            category: z.enum(RESOURCE_CATEGORIES),
            title: z.string().trim().min(1, "Give the resource a title").max(120, "Title is too long"),
            description: z.string().trim().max(500, "Description is too long").default(""),
            youtubeId: z
              .string()
              .trim()
              .regex(/^[A-Za-z0-9_-]{6,20}$/, "This YouTube link does not look valid")
              .optional()
              .nullable(),
            fileName: z.string().trim().max(160, "File name is too long").optional().nullable(),
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
                ctx.addIssue({ code: "custom", path: ["youtubeId"], message: "A YouTube link is required for videos." });
              }
              if (data.dataBase64) {
                ctx.addIssue({ code: "custom", path: ["dataBase64"], message: "Videos are shared as YouTube links; remove the file payload." });
              }
            } else if (!data.dataBase64 || !data.fileName) {
              ctx.addIssue({ code: "custom", path: ["dataBase64"], message: "Select a file to publish." });
            }
          })
      )
      .mutation(async ({ input, ctx }) =>
        db.createResource({
          ...input,
          createdBy: ctx.user.openId,
          createdByName: ctx.user.name ?? null,
        })
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
          title: z.string().trim().min(1, "Give the assignment a title").max(120, "Title is too long"),
          subject: z.string().trim().min(1, "Pick a subject").max(80, "Subject is too long"),
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
              })
            )
            .max(20)
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) =>
        db.createAssignment({
          ...input,
          due: input.due ?? null,
          createdBy: ctx.user.openId,
          createdByName: ctx.user.name ?? null,
        })
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

    /** Saves edits to the working draft (does not publish). */
    update: adminProcedure
      .input(landingContentSchema)
      .mutation(async ({ input, ctx }) => db.updateSiteContent(input, ctx.user.name ?? null)),

    /** Copies the current draft to the live site and remembers the previous one. */
    publish: adminProcedure.mutation(async ({ ctx }) => db.publishSiteContent(ctx.user.name ?? null)),

    /** Rolls the working draft back to the last published version. */
    revert: adminProcedure.mutation(async ({ ctx }) => db.revertSiteContent(ctx.user.name ?? null)),
  }),
});

export type AppRouter = typeof appRouter;
