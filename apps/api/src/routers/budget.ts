import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { budgetItemCreateSchema, budgetItemUpdateSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"

// The budget tracker is a producer/coordinator concern — gated by the
// same permission as the schedule (production planning). No new flag.
const canEditBudget = requirePermission("canEditSchedule")

export const budgetRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    const items = await ctx.prisma.budgetItem.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ category: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    })
    // Roll up per category + grand totals (estimated vs actual)
    const byCategory: Record<string, { estimated: number; actual: number; count: number }> = {}
    let estimatedTotal = 0
    let actualTotal = 0
    for (const it of items) {
      const est = it.estimated * it.quantity
      const act = (it.actual ?? 0) * it.quantity
      estimatedTotal += est
      if (it.actual != null) actualTotal += act
      const c = (byCategory[it.category] ??= { estimated: 0, actual: 0, count: 0 })
      c.estimated += est
      if (it.actual != null) c.actual += act
      c.count += 1
    }
    return { items, byCategory, estimatedTotal, actualTotal }
  }),

  create: canEditBudget.input(budgetItemCreateSchema).mutation(async ({ ctx, input }) => {
    const last = await ctx.prisma.budgetItem.findFirst({
      where: { projectId: input.projectId, category: input.category },
      orderBy: { order: "desc" },
    })
    const { projectId, ...rest } = input
    return ctx.prisma.budgetItem.create({
      data: { projectId, ...rest, order: (last?.order ?? -1) + 1 },
    })
  }),

  update: canEditBudget.input(budgetItemUpdateSchema).mutation(async ({ ctx, input }) => {
    const item = await ctx.prisma.budgetItem.findUnique({ where: { id: input.itemId } })
    if (!item || item.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:budgetItem" })
    }
    return ctx.prisma.budgetItem.update({ where: { id: input.itemId }, data: input.data })
  }),

  delete: canEditBudget
    .input(z.object({ projectId: z.string(), itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.budgetItem.findUnique({ where: { id: input.itemId } })
      if (!item || item.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:budgetItem" })
      }
      await ctx.prisma.budgetItem.delete({ where: { id: input.itemId } })
      return { ok: true }
    }),
})
