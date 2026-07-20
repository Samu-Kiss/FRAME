import { z } from "zod"
import { router, authedProcedure } from "../trpc.js"

// The inbox is per-user across ALL their projects (header bell), so it
// hangs off authedProcedure rather than projectProcedure.
export const notificationsRouter = router({
  list: authedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const [items, unread] = await Promise.all([
        ctx.prisma.notification.findMany({
          where: { userId: ctx.dbUser.id },
          orderBy: { createdAt: "desc" },
          take: input?.limit ?? 20,
          include: { project: { select: { id: true, title: true } } },
        }),
        ctx.prisma.notification.count({ where: { userId: ctx.dbUser.id, read: false } }),
      ])
      return { items, unread }
    }),

  markRead: authedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.updateMany({
        where: { id: input.notificationId, userId: ctx.dbUser.id },
        data: { read: true },
      })
      return { ok: true }
    }),

  markAllRead: authedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.notification.updateMany({
      where: { userId: ctx.dbUser.id, read: false },
      data: { read: true },
    })
    return { ok: true }
  }),
})
