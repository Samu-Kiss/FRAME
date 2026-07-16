import { z } from "zod"
import { propCategorySchema, propStatusSchema, propSourceSchema, richTextSchema } from "./enums.js"

const propFields = z.object({
  name: z.string().min(1).max(200),
  description: richTextSchema.nullable().optional(),
  category: propCategorySchema,
  quantity: z.number().int().min(0).optional(),
  status: propStatusSchema.optional(),
  source: propSourceSchema.nullable().optional(),
  sourceName: z.string().max(200).nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
  notes: richTextSchema.nullable().optional(),
})

export const propCreateSchema = z.object({
  projectId: z.string(),
  sceneIds: z.array(z.string()).optional(),
}).merge(propFields)

export const propUpdateSchema = z.object({
  projectId: z.string(),
  propId: z.string(),
  data: propFields.partial(),
  sceneIds: z.array(z.string()).optional(),
})
