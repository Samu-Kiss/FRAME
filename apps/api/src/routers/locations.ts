import { z } from "zod"
import { locationCreateSchema, locationUpdateSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"

export const locationsRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.location.findMany({
      where: { projectId: input.projectId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { scenes: true, tasks: { where: { status: { not: "DONE" } } } } },
      },
    })
  }),

  create: requirePermission("canEditLocations")
    .input(locationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, coordinates, scoutingNotes, accessNotes, availableDates, ...rest } = input
      return ctx.prisma.location.create({
        data: {
          projectId,
          ...rest,
          coordinates: coordinates as never,
          scoutingNotes: scoutingNotes as never,
          accessNotes: accessNotes as never,
          availableDates: availableDates as never,
        },
      })
    }),

  update: requirePermission("canEditLocations")
    .input(locationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.location, input.locationId, input.projectId, "location")
      const { coordinates, scoutingNotes, accessNotes, availableDates, ...rest } = input.data
      return ctx.prisma.location.update({
        where: { id: input.locationId },
        data: {
          ...rest,
          coordinates: coordinates as never,
          scoutingNotes: scoutingNotes as never,
          accessNotes: accessNotes as never,
          availableDates: availableDates as never,
        },
      })
    }),

  delete: requirePermission("canEditLocations")
    .input(z.object({ projectId: z.string(), locationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.location, input.locationId, input.projectId, "location")
      await ctx.prisma.location.delete({ where: { id: input.locationId } })
      return { ok: true }
    }),
})
