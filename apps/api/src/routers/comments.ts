import { TRPCError } from "@trpc/server"
import { commentListSchema, commentCreateSchema, commentDeleteSchema } from "@frame/validators"
import { router, projectProcedure } from "../trpc.js"
import { notify } from "../services/notify.js"

// Comment threads are available to any project member (MVP+ §1.10) —
// collaboration isn't gated by the edit permissions.
export const commentsRouter = router({
  list: projectProcedure.input(commentListSchema).query(async ({ ctx, input }) => {
    return ctx.prisma.comment.findMany({
      where: { projectId: input.projectId, entityType: input.entityType, entityId: input.entityId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
  }),

  // Unread comment counts for a set of entities — powers thread badges.
  counts: projectProcedure
    .input(commentListSchema.pick({ projectId: true, entityType: true }).extend({
      entityIds: commentListSchema.shape.entityId.array(),
    }))
    .query(async ({ ctx, input }) => {
      const grouped = await ctx.prisma.comment.groupBy({
        by: ["entityId"],
        where: { projectId: input.projectId, entityType: input.entityType, entityId: { in: input.entityIds } },
        _count: true,
      })
      return Object.fromEntries(grouped.map((g) => [g.entityId, g._count]))
    }),

  create: projectProcedure.input(commentCreateSchema).mutation(async ({ ctx, input }) => {
    // Validate mentioned users are actually members of this project
    const validMentions = input.mentions?.length
      ? (
          await ctx.prisma.projectMember.findMany({
            where: { projectId: input.projectId, userId: { in: input.mentions } },
            select: { userId: true },
          })
        ).map((m) => m.userId)
      : []

    const comment = await ctx.prisma.comment.create({
      data: {
        projectId: input.projectId,
        userId: ctx.dbUser.id,
        entityType: input.entityType,
        entityId: input.entityId,
        body: input.body,
        mentions: validMentions,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })

    // Notify: mentioned users, plus anyone else who commented on this entity.
    const priorCommenters = await ctx.prisma.comment.findMany({
      where: { projectId: input.projectId, entityType: input.entityType, entityId: input.entityId },
      select: { userId: true },
      distinct: ["userId"],
    })
    const label = `${input.entityType} thread`
    void notify(ctx.prisma, {
      projectId: input.projectId,
      recipientIds: validMentions,
      actorId: ctx.dbUser.id,
      actorName: ctx.dbUser.name,
      type: "MENTION",
      entityType: input.entityType,
      entityId: input.entityId,
      message: `${ctx.dbUser.name} mentioned you in a ${label}`,
    })
    void notify(ctx.prisma, {
      projectId: input.projectId,
      recipientIds: priorCommenters.map((c) => c.userId).filter((id) => !validMentions.includes(id)),
      actorId: ctx.dbUser.id,
      actorName: ctx.dbUser.name,
      type: "COMMENT",
      entityType: input.entityType,
      entityId: input.entityId,
      message: `${ctx.dbUser.name} replied on a ${label}`,
    })

    return comment
  }),

  delete: projectProcedure.input(commentDeleteSchema).mutation(async ({ ctx, input }) => {
    const comment = await ctx.prisma.comment.findUnique({ where: { id: input.commentId } })
    if (!comment || comment.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:comment" })
    }
    // Only the author or a project admin can delete a comment
    if (comment.userId !== ctx.dbUser.id && !ctx.permissions.isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "NOT_COMMENT_AUTHOR" })
    }
    await ctx.prisma.comment.delete({ where: { id: input.commentId } })
    return { ok: true }
  }),
})
