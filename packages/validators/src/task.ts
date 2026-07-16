import { z } from "zod"
import { taskStatusSchema, taskPrioritySchema, richTextSchema } from "./enums.js"

export const taskCreateSchema = z.object({
  projectId: z.string(),
  personId: z.string().nullable().optional(), // owner Person (inbox)
  assigneeIds: z.array(z.string()).optional(), // a task can have multiple assignees
  title: z.string().min(1).max(300),
  description: richTextSchema.nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  linkedEntityType: z.string().max(50).nullable().optional(),
  linkedEntityId: z.string().nullable().optional(),
  propId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
})

export const taskUpdateSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  data: taskCreateSchema.omit({ projectId: true, assigneeIds: true }).partial(),
  assigneeIds: z.array(z.string()).optional(), // replaces the full assignee set when present
})
