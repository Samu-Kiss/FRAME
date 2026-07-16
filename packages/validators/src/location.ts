import { z } from "zod"
import { locationTypeSchema, permitStatusSchema, richTextSchema } from "./enums.js"
import { dateRangeSchema } from "./project.js"

const locationFields = z.object({
  name: z.string().min(1).max(200),
  type: locationTypeSchema,
  address: z.string().max(400).nullable().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  permitRequired: z.boolean().optional(),
  permitStatus: permitStatusSchema.optional(),
  scoutingNotes: richTextSchema.nullable().optional(),
  accessNotes: richTextSchema.nullable().optional(),
  powerAvailable: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  availableDates: z.array(dateRangeSchema).nullable().optional(),
})

export const locationCreateSchema = z.object({ projectId: z.string() }).merge(locationFields)

export const locationUpdateSchema = z.object({
  projectId: z.string(),
  locationId: z.string(),
  data: locationFields.partial(),
})
