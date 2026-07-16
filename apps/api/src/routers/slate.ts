import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { slateSaveSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"
import { resolveSlate } from "../services/slate.js"

export const slateRouter = router({
  // Live preview data — config + resolved values in one call (§4.11).
  resolve: projectProcedure
    .input(z.object({ projectId: z.string(), shotId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
      try {
        return await resolveSlate(input.projectId, input.shotId)
      } catch (e) {
        throw new TRPCError({ code: "NOT_FOUND", message: e instanceof Error ? e.message : "ENTITY_NOT_FOUND:shot" })
      }
    }),

  saveConfig: requirePermission("canEditShotlist")
    .input(slateSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
      await ctx.prisma.shot.update({
        where: { id: input.shotId },
        data: { slateConfig: input.config as never },
      })
      return resolveSlate(input.projectId, input.shotId)
    }),
})
