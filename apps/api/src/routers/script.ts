import { scriptUpdateSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "screenplayBlock", attrs: { blockType: "sceneHeading" }, content: [] }],
}

export const scriptRouter = router({
  // One script per project (§4.3) — created lazily on first open.
  get: projectProcedure.query(async ({ ctx, input }) => {
    const existing = await ctx.prisma.script.findUnique({ where: { projectId: input.projectId } })
    if (existing) return existing
    return ctx.prisma.script.create({
      data: { projectId: input.projectId, content: EMPTY_DOC },
    })
  }),

  update: requirePermission("canEditScript")
    .input(scriptUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.script.upsert({
        where: { projectId: input.projectId },
        update: { content: input.content as never },
        create: { projectId: input.projectId, content: input.content as never },
      })
    }),
})
