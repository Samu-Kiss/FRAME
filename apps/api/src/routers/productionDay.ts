import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  productionDayCreateSchema, productionDayUpdateSchema,
  scheduleBlockCreateSchema, scheduleBlockUpdateSchema,
  crewCallSetSchema, talentCallSetSchema,
} from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"

const dayInclude = {
  locations: { include: { location: true } },
  scheduleBlocks: {
    orderBy: [{ startTime: "asc" as const }, { order: "asc" as const }],
    include: {
      location: { select: { id: true, name: true } },
      shots: { include: { shot: { select: { id: true, shotNumber: true, shotName: true, status: true } } } },
    },
  },
  crewCalls: { include: { person: { select: { id: true, name: true, role: true } } } },
  talentCalls: { include: { person: { select: { id: true, name: true, role: true } } } },
}

export const productionDayRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.productionDay.findMany({
      where: { projectId: input.projectId },
      orderBy: { date: "asc" },
      include: {
        locations: { include: { location: { select: { id: true, name: true } } } },
        _count: { select: { scheduleBlocks: true, crewCalls: true, talentCalls: true } },
      },
    })
  }),

  get: projectProcedure
    .input(z.object({ projectId: z.string(), productionDayId: z.string() }))
    .query(async ({ ctx, input }) => {
      const day = await ctx.prisma.productionDay.findUnique({
        where: { id: input.productionDayId },
        include: dayInclude,
      })
      if (!day || day.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:productionDay" })
      }
      return day
    }),

  create: requirePermission("canEditSchedule")
    .input(productionDayCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.productionDay.create({
          data: {
            projectId: input.projectId,
            date: new Date(input.date),
            generalCallTime: input.generalCallTime,
            generalNotes: input.generalNotes as never,
            locations: input.locationIds?.length
              ? { create: input.locationIds.map((locationId) => ({ locationId })) }
              : undefined,
          },
          include: dayInclude,
        })
      } catch (e: unknown) {
        if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
          throw new TRPCError({ code: "CONFLICT", message: "PRODUCTION_DAY_EXISTS" })
        }
        throw e
      }
    }),

  update: requirePermission("canEditSchedule")
    .input(productionDayUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.productionDay, input.productionDayId, input.projectId, "productionDay")
      const day = await ctx.prisma.productionDay.update({
        where: { id: input.productionDayId },
        data: {
          ...(input.data.date ? { date: new Date(input.data.date) } : {}),
          generalCallTime: input.data.generalCallTime,
          generalNotes: input.data.generalNotes as never,
          status: input.data.status,
        },
      })
      if (input.locationIds) {
        await ctx.prisma.productionDayLocation.deleteMany({ where: { productionDayId: day.id } })
        if (input.locationIds.length) {
          await ctx.prisma.productionDayLocation.createMany({
            data: input.locationIds.map((locationId) => ({ productionDayId: day.id, locationId })),
          })
        }
      }
      return day
    }),

  delete: requirePermission("canEditSchedule")
    .input(z.object({ projectId: z.string(), productionDayId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.productionDay, input.productionDayId, input.projectId, "productionDay")
      await ctx.prisma.productionDay.delete({ where: { id: input.productionDayId } })
      return { ok: true }
    }),

  createBlock: requirePermission("canEditSchedule")
    .input(scheduleBlockCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.productionDay, input.productionDayId, input.projectId, "productionDay")
      const { projectId: _p, shotIds, ...data } = input
      return ctx.prisma.scheduleBlock.create({
        data: {
          ...data,
          shots: shotIds?.length ? { create: shotIds.map((shotId) => ({ shotId })) } : undefined,
        },
      })
    }),

  updateBlock: requirePermission("canEditSchedule")
    .input(scheduleBlockUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.prisma.scheduleBlock.findUnique({
        where: { id: input.blockId },
        include: { productionDay: { select: { projectId: true } } },
      })
      if (!block || block.productionDay.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:scheduleBlock" })
      }
      const updated = await ctx.prisma.scheduleBlock.update({
        where: { id: input.blockId },
        data: input.data,
      })
      if (input.shotIds) {
        await ctx.prisma.scheduleBlockShot.deleteMany({ where: { scheduleBlockId: input.blockId } })
        if (input.shotIds.length) {
          await ctx.prisma.scheduleBlockShot.createMany({
            data: input.shotIds.map((shotId) => ({ scheduleBlockId: input.blockId, shotId })),
          })
        }
      }
      return updated
    }),

  deleteBlock: requirePermission("canEditSchedule")
    .input(z.object({ projectId: z.string(), blockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.prisma.scheduleBlock.findUnique({
        where: { id: input.blockId },
        include: { productionDay: { select: { projectId: true } } },
      })
      if (!block || block.productionDay.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:scheduleBlock" })
      }
      await ctx.prisma.scheduleBlock.delete({ where: { id: input.blockId } })
      return { ok: true }
    }),

  setCrewCalls: requirePermission("canEditSchedule")
    .input(crewCallSetSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.productionDay, input.productionDayId, input.projectId, "productionDay")
      await ctx.prisma.crewCall.deleteMany({ where: { productionDayId: input.productionDayId } })
      if (input.calls.length) {
        await ctx.prisma.crewCall.createMany({
          data: input.calls.map((c) => ({ productionDayId: input.productionDayId, ...c })),
        })
      }
      return { ok: true }
    }),

  setTalentCalls: requirePermission("canEditSchedule")
    .input(talentCallSetSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.productionDay, input.productionDayId, input.projectId, "productionDay")
      await ctx.prisma.talentCall.deleteMany({ where: { productionDayId: input.productionDayId } })
      if (input.calls.length) {
        await ctx.prisma.talentCall.createMany({
          data: input.calls.map((c) => ({ productionDayId: input.productionDayId, ...c })),
        })
      }
      return { ok: true }
    }),
})
