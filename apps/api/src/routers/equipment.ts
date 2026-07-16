import { z } from "zod"
import { equipmentCreateSchema, equipmentUpdateSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"

// Equipment lives under the camera department's responsibility —
// gated by canEditCameraData (the PermissionSet has no equipment flag).
export const equipmentRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.equipment.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        assignedTo: { include: { crew: { include: { person: { select: { id: true, name: true } } } } } },
        _count: { select: { shotEquipment: true } },
      },
    })
  }),

  create: requirePermission("canEditCameraData")
    .input(equipmentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, assignedCrewIds, availableDates, ...rest } = input
      return ctx.prisma.equipment.create({
        data: {
          projectId,
          ...rest,
          availableDates: availableDates as never,
          assignedTo: assignedCrewIds?.length
            ? { create: assignedCrewIds.map((crewId) => ({ crewId })) }
            : undefined,
        },
      })
    }),

  update: requirePermission("canEditCameraData")
    .input(equipmentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.equipment, input.equipmentId, input.projectId, "equipment")
      const { availableDates, ...rest } = input.data
      const equipment = await ctx.prisma.equipment.update({
        where: { id: input.equipmentId },
        data: { ...rest, availableDates: availableDates as never },
      })
      if (input.assignedCrewIds) {
        await ctx.prisma.personEquipment.deleteMany({ where: { equipmentId: input.equipmentId } })
        if (input.assignedCrewIds.length) {
          await ctx.prisma.personEquipment.createMany({
            data: input.assignedCrewIds.map((crewId) => ({ crewId, equipmentId: input.equipmentId })),
          })
        }
      }
      return equipment
    }),

  delete: requirePermission("canEditCameraData")
    .input(z.object({ projectId: z.string(), equipmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.equipment, input.equipmentId, input.projectId, "equipment")
      await ctx.prisma.equipment.delete({ where: { id: input.equipmentId } })
      return { ok: true }
    }),
})
