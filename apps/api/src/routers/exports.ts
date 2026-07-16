import { TRPCError } from "@trpc/server"
import { exportRequestSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { exportAllowed } from "../config/plans.js"
import { uploadExport } from "../lib/storage.js"
import { generateCallSheet, generateShotListPdf, generateShotListCsv, type ExportFile } from "../services/pdfExport.js"

export const exportsRouter = router({
  request: requirePermission("canExport")
    .input(exportRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Plan gate: export type (§2.13)
      if (!exportAllowed(ctx.plan, input.type)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "PLAN_LIMIT_EXCEEDED:export_type" })
      }
      // Plan gate: exports per day (§2.14)
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const todayCount = await ctx.prisma.exportJob.count({
        where: { userId: ctx.dbUser.id, createdAt: { gte: startOfDay } },
      })
      if (todayCount >= ctx.limits.exportsPerDay) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "PLAN_LIMIT_EXCEEDED:exports_per_day" })
      }

      const job = await ctx.prisma.exportJob.create({
        data: {
          projectId: input.projectId,
          userId: ctx.dbUser.id,
          type: input.type,
          entityId: input.entityId,
          status: "PROCESSING",
        },
      })

      try {
        let file: ExportFile
        switch (input.type) {
          case "CALL_SHEET": {
            if (!input.entityId) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "ENTITY_REQUIRED:productionDay" })
            }
            file = await generateCallSheet(input.projectId, input.entityId)
            break
          }
          case "SHOT_LIST": {
            file =
              input.format === "csv"
                ? await generateShotListCsv(input.projectId)
                : await generateShotListPdf(input.projectId)
            break
          }
          default:
            throw new TRPCError({ code: "BAD_REQUEST", message: "EXPORT_TYPE_NOT_AVAILABLE" })
        }

        const { signedUrl } = await uploadExport({
          projectId: input.projectId,
          filename: file.filename,
          body: file.body,
          contentType: file.contentType,
        })

        await ctx.prisma.exportJob.update({
          where: { id: job.id },
          data: { status: "DONE", fileUrl: signedUrl, completedAt: new Date() },
        })

        return { jobId: job.id, url: signedUrl, filename: file.filename }
      } catch (err) {
        await ctx.prisma.exportJob.update({
          where: { id: job.id },
          data: { status: "FAILED", error: err instanceof Error ? err.message : "Unknown error" },
        })
        throw err
      }
    }),

  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.exportJob.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    })
  }),
})
