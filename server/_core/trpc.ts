import { NOT_ADMIN_ERR_MSG, NOT_TUTOR_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const SUSPENDED_MSG = "Your account has been suspended. Please contact support.";

/**
 * Suspended accounts are blocked at the middleware layer: their current
 * session is rejected on every call (immediate invalidation) and logins are
 * separately rejected in the auth procedure.
 */
function assertActive(role: string | null, status: string | null | undefined) {
  if (status === "suspended") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: SUSPENDED_MSG });
  }
  void role;
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  assertActive(ctx.user.role, ctx.user.status);

  return next({
    ctx: {
      ...ctx,
      // Guarded above: downstream procedures can rely on a non-null user.
      user: ctx.user as NonNullable<TrpcContext["user"]>,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    assertActive(ctx.user.role, ctx.user.status);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as NonNullable<TrpcContext["user"]>,
      },
    });
  }),
);

export const tutorProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'tutor' && ctx.user.role !== 'admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_TUTOR_ERR_MSG });
    }
    assertActive(ctx.user.role, ctx.user.status);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as NonNullable<TrpcContext["user"]>,
      },
    });
  }),
);
