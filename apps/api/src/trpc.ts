import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { z } from "zod"
import { requestContext, type PlanTier } from "@frame/db"
import { permissionSetSchema, type PermissionSet } from "@frame/validators"
import type { Context } from "./context.js"
import { PLAN_LIMITS, type PlanConfig } from "./config/plans.js"

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// ── 1. Auth (§2.5) ─────────────────────────────────────────────
// Verifies the Supabase JWT, lazily mirrors the user into our User
// table, loads the plan, and scopes the changelog request context.
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const authUser = ctx.user
  if (!authUser) throw new TRPCError({ code: "UNAUTHORIZED" })

  const dbUser = await ctx.prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: { id: authUser.id, email: authUser.email, name: authUser.name },
  })

  const limits: PlanConfig = PLAN_LIMITS[dbUser.plan as PlanTier]

  return requestContext.run({ userId: dbUser.id }, () =>
    next({ ctx: { ...ctx, user: authUser, dbUser, plan: dbUser.plan as PlanTier, limits } })
  )
})

// ── 2. Project membership + permissions (§2.5) ────────────────
export const projectProcedure = authedProcedure
  .input(z.object({ projectId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const membership = await ctx.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: input.projectId, userId: ctx.dbUser.id } },
    })
    if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "NOT_A_MEMBER" })

    const parsed = permissionSetSchema.safeParse(membership.permissions)
    const permissions: PermissionSet = parsed.success
      ? parsed.data
      : // legacy/malformed rows degrade to read-only
        {
          canEditScript: false, canEditShotlist: false, canEditCameraData: false,
          canEditSchedule: false, canEditPeople: false, canEditLocations: false,
          canEditStyling: false, canEditProps: false, canExport: false,
          canManageMembers: false, isAdmin: membership.isAdmin,
        }
    if (membership.isAdmin) permissions.isAdmin = true

    return next({ ctx: { ...ctx, membership, permissions } })
  })

// ── 3. Specific permission guards (§2.5) ───────────────────────
export function requirePermission(key: keyof PermissionSet) {
  return projectProcedure.use(({ ctx, next }) => {
    if (!ctx.permissions.isAdmin && !ctx.permissions[key]) {
      throw new TRPCError({ code: "FORBIDDEN", message: `MISSING_PERMISSION:${key}` })
    }
    return next()
  })
}

export const adminProcedure = projectProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "MISSING_PERMISSION:isAdmin" })
  }
  return next()
})
