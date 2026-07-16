import { z } from "zod"
import { stylingItemStatusSchema, richTextSchema } from "./enums.js"

const stylingFields = z.object({
  lookName: z.string().min(1).max(200),
  description: richTextSchema.nullable().optional(),
  notes: richTextSchema.nullable().optional(),
})

export const stylingCreateSchema = z.object({
  projectId: z.string(),
  characterId: z.string(), // Person — must be TALENT
  sceneIds: z.array(z.string()).optional(),
}).merge(stylingFields)

export const stylingUpdateSchema = z.object({
  projectId: z.string(),
  stylingId: z.string(),
  data: stylingFields.partial().extend({
    characterId: z.string().optional(),
  }),
  sceneIds: z.array(z.string()).optional(), // replaces the scene set when present
})

const itemFields = z.object({
  item: z.string().min(1).max(200),
  brand: z.string().max(100).nullable().optional(),
  color: z.string().min(1).max(50),
  size: z.string().max(50).nullable().optional(),
  status: stylingItemStatusSchema.optional(),
})

export const stylingItemCreateSchema = z.object({
  projectId: z.string(),
  stylingId: z.string(),
  kind: z.enum(["garment", "accessory"]),
}).merge(itemFields)

export const stylingItemUpdateSchema = z.object({
  projectId: z.string(),
  itemId: z.string(),
  kind: z.enum(["garment", "accessory"]),
  data: itemFields.partial(),
})

export const stylingItemDeleteSchema = z.object({
  projectId: z.string(),
  itemId: z.string(),
  kind: z.enum(["garment", "accessory"]),
})
