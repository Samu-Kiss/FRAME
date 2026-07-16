import { z } from "zod"
import { propCreateSchema, propUpdateSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"

export const propsRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.prop.findMany({
      where: { projectId: input.projectId },
      orderBy: { name: "asc" },
      include: {
        sceneProps: { include: { scene: { select: { id: true, number: true, title: true } } } },
        shotProps: { include: { shot: { select: { id: true, shotNumber: true } } } },
        _count: { select: { tasks: { where: { status: { not: "DONE" } } } } },
      },
    })
  }),

  create: requirePermission("canEditProps")
    .input(propCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, sceneIds, description, notes, ...rest } = input
      return ctx.prisma.prop.create({
        data: {
          projectId,
          ...rest,
          description: description as never,
          notes: notes as never,
          sceneProps: sceneIds?.length
            ? { create: sceneIds.map((sceneId) => ({ sceneId })) }
            : undefined,
        },
      })
    }),

  update: requirePermission("canEditProps")
    .input(propUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.prop, input.propId, input.projectId, "prop")
      const { description, notes, ...rest } = input.data
      const prop = await ctx.prisma.prop.update({
        where: { id: input.propId },
        data: { ...rest, description: description as never, notes: notes as never },
      })
      if (input.sceneIds) {
        await ctx.prisma.sceneProp.deleteMany({ where: { propId: input.propId } })
        if (input.sceneIds.length) {
          await ctx.prisma.sceneProp.createMany({
            data: input.sceneIds.map((sceneId) => ({ sceneId, propId: input.propId })),
          })
        }
      }
      return prop
    }),

  delete: requirePermission("canEditProps")
    .input(z.object({ projectId: z.string(), propId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.prop, input.propId, input.projectId, "prop")
      await ctx.prisma.prop.delete({ where: { id: input.propId } })
      return { ok: true }
    }),
})
