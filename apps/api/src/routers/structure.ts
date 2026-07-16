import { TRPCError } from "@trpc/server"
import { z } from "zod"
import {
  actCreateSchema, actUpdateSchema, sceneCreateSchema, sceneUpdateSchema,
  shotCreateSchema, shotUpdateSchema, shotPeopleSetSchema, shotRelationSetSchema,
} from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"

const CAMERA_KEYS = ["frameSize", "lensSize", "cameraMovements", "cameraAngle"] as const

export const structureRouter = router({
  // Full narrative tree — the shotlist's single data source.
  tree: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.act.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ order: "asc" }, { number: "asc" }],
      include: {
        scenes: {
          orderBy: { order: "asc" },
          include: {
            location: { select: { id: true, name: true, type: true } },
            shots: {
              orderBy: { order: "asc" },
              include: {
                people: { include: { person: { select: { id: true, name: true, department: true } } } },
                props: { include: { prop: { select: { id: true, name: true } } } },
                equipment: { include: { equipment: { select: { id: true, name: true, type: true } } } },
              },
            },
          },
        },
      },
    })
  }),

  createAct: requirePermission("canEditShotlist")
    .input(actCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.prisma.act.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "desc" },
      })
      return ctx.prisma.act.create({
        data: { ...input, description: input.description as never, order: (last?.order ?? -1) + 1 },
      })
    }),

  updateAct: requirePermission("canEditShotlist")
    .input(actUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.act, input.actId, input.projectId, "act")
      return ctx.prisma.act.update({
        where: { id: input.actId },
        data: { ...input.data, description: input.data.description as never },
      })
    }),

  deleteAct: requirePermission("canEditShotlist")
    .input(z.object({ projectId: z.string(), actId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.act, input.actId, input.projectId, "act")
      await ctx.prisma.act.delete({ where: { id: input.actId } })
      return { ok: true }
    }),

  createScene: requirePermission("canEditShotlist")
    .input(sceneCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.act, input.actId, input.projectId, "act")
      const last = await ctx.prisma.scene.findFirst({
        where: { actId: input.actId },
        orderBy: { order: "desc" },
      })
      return ctx.prisma.scene.create({
        data: {
          actId: input.actId,
          projectId: input.projectId,
          number: input.number,
          title: input.title,
          synopsis: input.synopsis as never,
          locationId: input.locationId,
          daylight: input.daylight,
          estimatedDuration: input.estimatedDuration,
          order: (last?.order ?? -1) + 1,
        },
      })
    }),

  updateScene: requirePermission("canEditShotlist")
    .input(sceneUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.scene, input.sceneId, input.projectId, "scene")
      return ctx.prisma.scene.update({
        where: { id: input.sceneId },
        data: {
          ...input.data,
          synopsis: input.data.synopsis as never,
          notes: input.data.notes as never,
        },
      })
    }),

  deleteScene: requirePermission("canEditShotlist")
    .input(z.object({ projectId: z.string(), sceneId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.scene, input.sceneId, input.projectId, "scene")
      await ctx.prisma.scene.delete({ where: { id: input.sceneId } })
      return { ok: true }
    }),

  createShot: requirePermission("canEditShotlist")
    .input(shotCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.scene, input.sceneId, input.projectId, "scene")
      const last = await ctx.prisma.shot.findFirst({
        where: { sceneId: input.sceneId },
        orderBy: { order: "desc" },
      })
      return ctx.prisma.shot.create({
        data: {
          sceneId: input.sceneId,
          projectId: input.projectId,
          shotNumber: input.shotNumber,
          shotName: input.shotName,
          description: input.description as never,
          frameSize: input.frameSize,
          order: (last?.order ?? -1) + 1,
        },
      })
    }),

  // Camera fields require canEditCameraData (§1.5); the rest canEditShotlist.
  updateShot: projectProcedure.input(shotUpdateSchema).mutation(async ({ ctx, input }) => {
    await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
    const keys = Object.keys(input.data)
    const touchesCamera = keys.some((k) => (CAMERA_KEYS as readonly string[]).includes(k))
    const touchesOther = keys.some((k) => !(CAMERA_KEYS as readonly string[]).includes(k))
    if (!ctx.permissions.isAdmin) {
      if (touchesCamera && !ctx.permissions.canEditCameraData) {
        throw new TRPCError({ code: "FORBIDDEN", message: "MISSING_PERMISSION:canEditCameraData" })
      }
      if (touchesOther && !ctx.permissions.canEditShotlist) {
        throw new TRPCError({ code: "FORBIDDEN", message: "MISSING_PERMISSION:canEditShotlist" })
      }
    }
    return ctx.prisma.shot.update({
      where: { id: input.shotId },
      data: {
        ...input.data,
        description: input.data.description as never,
        voiceover: input.data.voiceover as never,
        postNotes: input.data.postNotes as never,
        notes: input.data.notes as never,
      },
    })
  }),

  deleteShot: requirePermission("canEditShotlist")
    .input(z.object({ projectId: z.string(), shotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
      await ctx.prisma.shot.delete({ where: { id: input.shotId } })
      return { ok: true }
    }),

  setShotPeople: requirePermission("canEditShotlist")
    .input(shotPeopleSetSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
      await ctx.prisma.shotPerson.deleteMany({ where: { shotId: input.shotId } })
      if (input.people.length) {
        await ctx.prisma.shotPerson.createMany({
          data: input.people.map((p) => ({ shotId: input.shotId, ...p })),
        })
      }
      return { ok: true }
    }),

  setShotProps: requirePermission("canEditShotlist")
    .input(shotRelationSetSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
      await ctx.prisma.shotProp.deleteMany({ where: { shotId: input.shotId } })
      if (input.ids.length) {
        await ctx.prisma.shotProp.createMany({
          data: input.ids.map((propId) => ({ shotId: input.shotId, propId })),
        })
      }
      return { ok: true }
    }),

  setShotEquipment: requirePermission("canEditCameraData")
    .input(shotRelationSetSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.shot, input.shotId, input.projectId, "shot")
      await ctx.prisma.shotEquipment.deleteMany({ where: { shotId: input.shotId } })
      if (input.ids.length) {
        await ctx.prisma.shotEquipment.createMany({
          data: input.ids.map((equipmentId) => ({ shotId: input.shotId, equipmentId })),
        })
      }
      return { ok: true }
    }),
})

// Every nested entity write re-checks project scoping so a member of
// project A can never mutate rows of project B by guessing ids.
async function assertInProject(
  delegate: { findUnique: (args: { where: { id: string } }) => Promise<{ projectId: string } | null> },
  id: string,
  projectId: string,
  label: string
) {
  const row = await delegate.findUnique({ where: { id } })
  if (!row || row.projectId !== projectId) {
    throw new TRPCError({ code: "NOT_FOUND", message: `ENTITY_NOT_FOUND:${label}` })
  }
}

export { assertInProject }
