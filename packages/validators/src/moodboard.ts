import { z } from "zod"

export const moodboardItemTypeSchema = z.enum(["IMAGE", "VIDEO_REF", "COLOR_SWATCH", "TEXT_NOTE", "URL_EMBED"])

export const moodboardGetSchema = z.object({
  projectId: z.string(),
  sceneId: z.string().optional(), // omit → the project board (§4.10)
})

export const moodboardItemCreateSchema = z.object({
  projectId: z.string(),
  boardId: z.string(),
  type: moodboardItemTypeSchema,
  assetId: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  content: z.string().max(2000).optional(),
  caption: z.string().max(300).optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  width: z.number().min(40).max(2000).optional(),
  height: z.number().min(40).max(2000).optional(),
})

export const moodboardItemUpdateSchema = z.object({
  projectId: z.string(),
  itemId: z.string(),
  data: z.object({
    posX: z.number().optional(),
    posY: z.number().optional(),
    width: z.number().min(40).max(2000).optional(),
    height: z.number().min(40).max(2000).optional(),
    caption: z.string().max(300).nullable().optional(),
    content: z.string().max(2000).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    order: z.number().int().optional(),
  }),
})

export const moodboardLayoutSchema = z.object({
  projectId: z.string(),
  boardId: z.string(),
  layout: z.enum(["freeform", "grid"]),
})
