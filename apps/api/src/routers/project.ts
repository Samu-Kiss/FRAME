import { TRPCError } from "@trpc/server"
import { z } from "zod"
import {
  projectCreateSchema, projectCreateFromTemplateSchema, projectUpdateSchema, memberAddSchema, memberUpdateSchema,
  FULL_PERMISSIONS, type PermissionSet,
} from "@frame/validators"
import { router, authedProcedure, projectProcedure, adminProcedure, requirePermission } from "../trpc.js"
import { cloneProject } from "../services/cloneProject.js"

// Non-Team plans don't get granular permissions (§2.13): members are
// either admins or standard collaborators (edit everything, no admin).
const STANDARD_COLLABORATOR: PermissionSet = {
  ...FULL_PERMISSIONS,
  canManageMembers: false,
  isAdmin: false,
}

export const projectRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.prisma.project.findMany({
      where: { members: { some: { userId: ctx.dbUser.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { members: true, acts: true, persons: true, locations: true, productionDays: true } },
      },
    })
    const shotCounts = await ctx.prisma.shot.groupBy({
      by: ["projectId", "filmed"],
      where: { projectId: { in: projects.map((p) => p.id) } },
      _count: true,
    })
    return projects.map((p) => {
      const total = shotCounts.filter((s) => s.projectId === p.id).reduce((n, s) => n + s._count, 0)
      const filmed = shotCounts.find((s) => s.projectId === p.id && s.filmed)?._count ?? 0
      return { ...p, shotStats: { total, filmed } }
    })
  }),

  get: projectProcedure.query(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } } },
      },
    })
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:project" })
    return { ...project, myPermissions: ctx.permissions }
  }),

  dashboard: projectProcedure.query(async ({ ctx, input }) => {
    const [totalShots, filmedShots, pendingTasks, urgentTasks, scenes, recentChanges, nextDay] =
      await Promise.all([
        ctx.prisma.shot.count({ where: { projectId: input.projectId } }),
        ctx.prisma.shot.count({ where: { projectId: input.projectId, filmed: true } }),
        ctx.prisma.task.count({
          where: { projectId: input.projectId, status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] } },
        }),
        ctx.prisma.task.count({
          where: { projectId: input.projectId, status: { not: "DONE" }, priority: "URGENT" },
        }),
        ctx.prisma.scene.count({ where: { projectId: input.projectId } }),
        ctx.prisma.changeEntry.findMany({
          where: { projectId: input.projectId },
          orderBy: { timestamp: "desc" },
          take: 15,
          include: { user: { select: { name: true } } },
        }),
        ctx.prisma.productionDay.findFirst({
          where: { projectId: input.projectId, date: { gte: new Date() } },
          orderBy: { date: "asc" },
        }),
      ])
    return { totalShots, filmedShots, pendingTasks, urgentTasks, scenes, recentChanges, nextDay }
  }),

  // Own non-archived projects (clonable) + the global demo template (§1.10)
  listTemplates: authedProcedure.query(async ({ ctx }) => {
    const [own, demo] = await Promise.all([
      ctx.prisma.project.findMany({
        where: { ownerId: ctx.dbUser.id, status: { not: "ARCHIVED" } },
        select: { id: true, title: true, type: true, _count: { select: { acts: true, persons: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      ctx.prisma.project.findFirst({
        where: { creationSource: "demo_template" },
        select: { id: true, title: true, type: true },
        orderBy: { createdAt: "asc" },
      }),
    ])
    return { own, demo }
  }),

  create: authedProcedure.input(projectCreateSchema).mutation(async ({ ctx, input }) => {
    const activeCount = await ctx.prisma.project.count({
      where: { ownerId: ctx.dbUser.id, status: { not: "ARCHIVED" } },
    })
    if (activeCount >= ctx.limits.maxActiveProjects) {
      throw new TRPCError({ code: "FORBIDDEN", message: "PLAN_LIMIT_EXCEEDED:active_projects" })
    }
    return ctx.prisma.project.create({
      data: {
        title: input.title,
        type: input.type,
        client: input.client,
        brand: input.brand,
        description: input.description as never,
        shootDates: input.shootDates as never,
        ownerId: ctx.dbUser.id,
        members: {
          create: {
            userId: ctx.dbUser.id,
            projectRole: "Owner",
            permissions: FULL_PERMISSIONS,
            isAdmin: true,
          },
        },
      },
    })
  }),

  createFromTemplate: authedProcedure
    .input(projectCreateFromTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const activeCount = await ctx.prisma.project.count({
        where: { ownerId: ctx.dbUser.id, status: { not: "ARCHIVED" } },
      })
      if (activeCount >= ctx.limits.maxActiveProjects) {
        throw new TRPCError({ code: "FORBIDDEN", message: "PLAN_LIMIT_EXCEEDED:active_projects" })
      }

      const source = await ctx.prisma.project.findUnique({
        where: { id: input.sourceProjectId },
        select: { id: true, ownerId: true, creationSource: true, members: { where: { userId: ctx.dbUser.id }, select: { id: true } } },
      })
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:project" })

      // Clone: must be a member of the source. Demo: must actually be the demo template.
      if (input.source === "clone" && source.members.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "NOT_A_MEMBER" })
      }
      if (input.source === "demo" && source.creationSource !== "demo_template") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "NOT_A_DEMO_TEMPLATE" })
      }

      return cloneProject({
        sourceProjectId: input.sourceProjectId,
        ownerId: ctx.dbUser.id,
        ownerName: ctx.dbUser.name,
        newTitle: input.title,
        creationSource: input.source === "demo" ? "demo_template" : "cloned_project",
      })
    }),

  update: adminProcedure.input(projectUpdateSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.project.update({
      where: { id: input.projectId },
      data: {
        ...input.data,
        description: input.data.description as never,
        shootDates: input.data.shootDates as never,
      },
    })
  }),

  archive: adminProcedure.mutation(async ({ ctx, input }) => {
    return ctx.prisma.project.update({ where: { id: input.projectId }, data: { status: "ARCHIVED" } })
  }),

  delete: adminProcedure.mutation(async ({ ctx, input }) => {
    await ctx.prisma.project.delete({ where: { id: input.projectId } })
    return { ok: true }
  }),

  addMember: requirePermission("canManageMembers")
    .input(memberAddSchema)
    .mutation(async ({ ctx, input }) => {
      const memberCount = await ctx.prisma.projectMember.count({ where: { projectId: input.projectId } })
      if (memberCount >= ctx.limits.maxCollaborators) {
        throw new TRPCError({ code: "FORBIDDEN", message: "PLAN_LIMIT_EXCEEDED:collaborators" })
      }
      const user = await ctx.prisma.user.findUnique({ where: { email: input.email } })
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:user" })

      const permissions = ctx.limits.granularPermissions
        ? input.permissions
        : input.permissions.isAdmin
          ? FULL_PERMISSIONS
          : STANDARD_COLLABORATOR

      return ctx.prisma.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: user.id,
          projectRole: input.projectRole,
          permissions,
          isAdmin: permissions.isAdmin,
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    }),

  updateMember: requirePermission("canManageMembers")
    .input(memberUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const permissions =
        input.permissions && !ctx.limits.granularPermissions
          ? input.permissions.isAdmin
            ? FULL_PERMISSIONS
            : STANDARD_COLLABORATOR
          : input.permissions

      return ctx.prisma.projectMember.update({
        where: { id: input.memberId },
        data: {
          projectRole: input.projectRole,
          ...(permissions ? { permissions, isAdmin: permissions.isAdmin } : {}),
        },
      })
    }),

  removeMember: requirePermission("canManageMembers")
    .input(z.object({ projectId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.projectMember.findUnique({ where: { id: input.memberId } })
      if (!member || member.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:member" })
      }
      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId } })
      if (project?.ownerId === member.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CANNOT_REMOVE_OWNER" })
      }
      await ctx.prisma.projectMember.delete({ where: { id: input.memberId } })
      return { ok: true }
    }),
})
