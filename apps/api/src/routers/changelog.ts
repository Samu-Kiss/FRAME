import { z } from "zod"
import { router, projectProcedure } from "../trpc.js"

export const changelogRouter = router({
  list: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const entries = await ctx.prisma.changeEntry.findMany({
        where: {
          projectId: input.projectId,
          ...(input.entityType ? { entityType: input.entityType } : {}),
          ...(input.entityId ? { entityId: input.entityId } : {}),
        },
        orderBy: { timestamp: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: { user: { select: { id: true, name: true } } },
      })
      const nextCursor = entries.length > input.limit ? entries.pop()!.id : undefined
      return { entries, nextCursor }
    }),

  // Named versions (§4.2) — label the current state of an entity.
  nameVersion: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        namedVersion: z.string().min(1).max(200),
        note: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.changeEntry.create({
        data: {
          projectId: input.projectId,
          userId: ctx.dbUser.id,
          entityType: input.entityType,
          entityId: input.entityId,
          action: "UPDATED",
          namedVersion: input.namedVersion,
          note: input.note,
        },
      })
    }),
})
