import { z } from "zod"

// Entities that support comment threads (MVP+ §1.10).
export const commentableEntitySchema = z.enum([
  "Shot", "Scene", "Task", "Location", "Prop", "Styling", "Person", "Equipment", "ProductionDay",
])

export const commentListSchema = z.object({
  projectId: z.string(),
  entityType: commentableEntitySchema,
  entityId: z.string(),
})

export const commentCreateSchema = z.object({
  projectId: z.string(),
  entityType: commentableEntitySchema,
  entityId: z.string(),
  body: z.string().min(1).max(4000),
  mentions: z.array(z.string()).optional(), // User.id[]
})

export const commentDeleteSchema = z.object({
  projectId: z.string(),
  commentId: z.string(),
})
