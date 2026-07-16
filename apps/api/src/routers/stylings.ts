import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  stylingCreateSchema, stylingUpdateSchema,
  stylingItemCreateSchema, stylingItemUpdateSchema, stylingItemDeleteSchema,
} from "@frame/validators"
import type { PrismaClientType } from "@frame/db"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"

const stylingInclude = {
  character: { select: { id: true, name: true, talent: { select: { characterName: true } } } },
  scenes: { select: { id: true, number: true, title: true } },
  garments: { orderBy: { item: "asc" as const } },
  accessories: { orderBy: { item: "asc" as const } },
} as const

async function assertTalent(prisma: PrismaClientType, personId: string, projectId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } })
  if (!person || person.projectId !== projectId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:person" })
  }
  if (person.type !== "TALENT") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "STYLING_CHARACTER_MUST_BE_TALENT" })
  }
}

export const stylingsRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.styling.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ characterId: "asc" }, { lookName: "asc" }],
      include: stylingInclude,
    })
  }),

  create: requirePermission("canEditStyling")
    .input(stylingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTalent(ctx.prisma, input.characterId, input.projectId)
      return ctx.prisma.styling.create({
        data: {
          projectId: input.projectId,
          characterId: input.characterId,
          lookName: input.lookName,
          description: input.description as never,
          notes: input.notes as never,
          scenes: input.sceneIds?.length ? { connect: input.sceneIds.map((id) => ({ id })) } : undefined,
        },
        include: stylingInclude,
      })
    }),

  update: requirePermission("canEditStyling")
    .input(stylingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.styling, input.stylingId, input.projectId, "styling")
      if (input.data.characterId) await assertTalent(ctx.prisma, input.data.characterId, input.projectId)
      return ctx.prisma.styling.update({
        where: { id: input.stylingId },
        data: {
          ...input.data,
          description: input.data.description as never,
          notes: input.data.notes as never,
          ...(input.sceneIds ? { scenes: { set: input.sceneIds.map((id) => ({ id })) } } : {}),
        },
        include: stylingInclude,
      })
    }),

  delete: requirePermission("canEditStyling")
    .input(z.object({ projectId: z.string(), stylingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.styling, input.stylingId, input.projectId, "styling")
      await ctx.prisma.styling.delete({ where: { id: input.stylingId } })
      return { ok: true }
    }),

  // Garments and accessories share one shape (§4.8) — `kind` picks the table.
  addItem: requirePermission("canEditStyling")
    .input(stylingItemCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.styling, input.stylingId, input.projectId, "styling")
      const { projectId: _p, stylingId, kind, ...data } = input
      return kind === "garment"
        ? ctx.prisma.garment.create({ data: { stylingId, ...data } })
        : ctx.prisma.accessory.create({ data: { stylingId, ...data } })
    }),

  updateItem: requirePermission("canEditStyling")
    .input(stylingItemUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const delegate = input.kind === "garment" ? ctx.prisma.garment : ctx.prisma.accessory
      const item = await (delegate as typeof ctx.prisma.garment).findUnique({
        where: { id: input.itemId },
        include: { styling: { select: { projectId: true } } },
      })
      if (!item || item.styling.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `ENTITY_NOT_FOUND:${input.kind}` })
      }
      return (delegate as typeof ctx.prisma.garment).update({ where: { id: input.itemId }, data: input.data })
    }),

  deleteItem: requirePermission("canEditStyling")
    .input(stylingItemDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const delegate = input.kind === "garment" ? ctx.prisma.garment : ctx.prisma.accessory
      const item = await (delegate as typeof ctx.prisma.garment).findUnique({
        where: { id: input.itemId },
        include: { styling: { select: { projectId: true } } },
      })
      if (!item || item.styling.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `ENTITY_NOT_FOUND:${input.kind}` })
      }
      await (delegate as typeof ctx.prisma.garment).delete({ where: { id: input.itemId } })
      return { ok: true }
    }),
})
