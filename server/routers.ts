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
import { LIVE_PLATFORMS } from "@shared/session";
import { parseSchemePdf } from "./_core/schemeParser";
import type { User } from "@shared/user";
import { z } from "zod";
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
      .mutation(async ({ input, ctx }) =>
        db.createLiveSession({
          ...input,
          hostBy: ctx.user.openId,
          hostName: ctx.user.name ?? null,
        })
      ),

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
});

export type AppRouter = typeof appRouter;
