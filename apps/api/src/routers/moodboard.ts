import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  moodboardGetSchema, moodboardItemCreateSchema, moodboardItemUpdateSchema, moodboardLayoutSchema,
} from "@frame/validators"
import { router, projectProcedure } from "../trpc.js"
import { assertInProject } from "./structure.js"

const boardInclude = {
  items: {
    orderBy: { order: "asc" as const },
    include: { asset: { select: { id: true, publicUrl: true, filename: true, alt: true } } },
  },
} as const

// Membership is enough to pin references — moodboards are the project's
// shared visual scratchpad (§4.10), not a permission-gated document.
export const moodboardRouter = router({
  get: projectProcedure.input(moodboardGetSchema).query(async ({ ctx, input }) => {
    if (input.sceneId) {
      await assertInProject(ctx.prisma.scene, input.sceneId, input.projectId, "scene")
      const existing = await ctx.prisma.moodboardBoard.findUnique({
        where: { sceneId: input.sceneId },
        include: boardInclude,
      })
      if (existing) return existing
      return ctx.prisma.moodboardBoard.create({
        data: { sceneId: input.sceneId },
        include: boardInclude,
      })
    }
    const existing = await ctx.prisma.moodboardBoard.findUnique({
      where: { projectId: input.projectId },
      include: boardInclude,
    })
    if (existing) return existing
    return ctx.prisma.moodboardBoard.create({
      data: { projectId: input.projectId },
      include: boardInclude,
    })
  }),

  addItem: projectProcedure.input(moodboardItemCreateSchema).mutation(async ({ ctx, input }) => {
    await assertBoardInProject(ctx, input.boardId, input.projectId)
    const last = await ctx.prisma.moodboardItem.findFirst({
      where: { boardId: input.boardId },
      orderBy: { order: "desc" },
    })
    return ctx.prisma.moodboardItem.create({
      data: {
        boardId: input.boardId,
        type: input.type,
        assetId: input.assetId,
        color: input.color,
        content: input.content,
        caption: input.caption,
        posX: input.posX ?? 40 + Math.random() * 120,
        posY: input.posY ?? 40 + Math.random() * 120,
        width: input.width ?? (input.type === "COLOR_SWATCH" ? 120 : 220),
        height: input.height ?? (input.type === "TEXT_NOTE" ? 120 : 160),
        order: (last?.order ?? -1) + 1,
      },
    })
  }),

  updateItem: projectProcedure.input(moodboardItemUpdateSchema).mutation(async ({ ctx, input }) => {
    const item = await ctx.prisma.moodboardItem.findUnique({
      where: { id: input.itemId },
      include: { board: { select: { projectId: true, sceneId: true } } },
    })
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:moodboardItem" })
    await assertBoardInProject(ctx, item.boardId, input.projectId)
    return ctx.prisma.moodboardItem.update({ where: { id: input.itemId }, data: input.data })
  }),

  deleteItem: projectProcedure
    .input(z.object({ projectId: z.string(), itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.moodboardItem.findUnique({ where: { id: input.itemId } })
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:moodboardItem" })
      await assertBoardInProject(ctx, item.boardId, input.projectId)
      await ctx.prisma.moodboardItem.delete({ where: { id: input.itemId } })
      return { ok: true }
    }),

  setLayout: projectProcedure.input(moodboardLayoutSchema).mutation(async ({ ctx, input }) => {
    await assertBoardInProject(ctx, input.boardId, input.projectId)
    return ctx.prisma.moodboardBoard.update({
      where: { id: input.boardId },
      data: { layout: input.layout },
    })
  }),
})

type Ctx = { prisma: typeof import("@frame/db").prisma }

async function assertBoardInProject(ctx: Ctx, boardId: string, projectId: string) {
  const board = await ctx.prisma.moodboardBoard.findUnique({
    where: { id: boardId },
    include: { scene: { select: { projectId: true } } },
  })
  const boardProject = board?.projectId ?? board?.scene?.projectId
  if (!board || boardProject !== projectId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:moodboard" })
  }
}
