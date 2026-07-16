import { z } from "zod"
import { equipmentTypeSchema } from "./enums.js"
import { dateRangeSchema } from "./project.js"

const equipmentFields = z.object({
  name: z.string().min(1).max(200),
  type: equipmentTypeSchema,
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  rentalSource: z.string().max(200).nullable().optional(),
  availableDates: z.array(dateRangeSchema).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const equipmentCreateSchema = z.object({
  projectId: z.string(),
  assignedCrewIds: z.array(z.string()).optional(),
}).merge(equipmentFields)

export const equipmentUpdateSchema = z.object({
  projectId: z.string(),
  equipmentId: z.string(),
  data: equipmentFields.partial(),
  assignedCrewIds: z.array(z.string()).optional(),
})
