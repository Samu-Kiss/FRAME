import { z } from "zod"
import {
  scheduleBlockTypeSchema, productionDayStatusSchema, departmentSchema,
  richTextSchema, timeSchema,
} from "./enums.js"

export const productionDayCreateSchema = z.object({
  projectId: z.string(),
  date: z.string(), // ISO date "YYYY-MM-DD"
  generalCallTime: timeSchema,
  generalNotes: richTextSchema.nullable().optional(),
  locationIds: z.array(z.string()).optional(),
})

export const productionDayUpdateSchema = z.object({
  projectId: z.string(),
  productionDayId: z.string(),
  data: z.object({
    date: z.string().optional(),
    generalCallTime: timeSchema.optional(),
    generalNotes: richTextSchema.nullable().optional(),
    status: productionDayStatusSchema.optional(),
  }),
  locationIds: z.array(z.string()).optional(),
})

export const scheduleBlockCreateSchema = z.object({
  projectId: z.string(),
  productionDayId: z.string(),
  startTime: timeSchema,
  endTime: timeSchema,
  type: scheduleBlockTypeSchema,
  label: z.string().min(1).max(200),
  parallel: z.boolean().optional(),
  parallelGroupId: z.string().max(100).nullable().optional(),
  locationId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  order: z.number().int().optional(),
  shotIds: z.array(z.string()).optional(),
})

export const scheduleBlockUpdateSchema = z.object({
  projectId: z.string(),
  blockId: z.string(),
  data: scheduleBlockCreateSchema.omit({ projectId: true, productionDayId: true, shotIds: true }).partial(),
  shotIds: z.array(z.string()).optional(),
})

export const crewCallSetSchema = z.object({
  projectId: z.string(),
  productionDayId: z.string(),
  calls: z.array(z.object({
    personId: z.string().nullable().optional(),
    department: departmentSchema.nullable().optional(),
    callTime: timeSchema,
  })),
})

export const talentCallSetSchema = z.object({
  projectId: z.string(),
  productionDayId: z.string(),
  calls: z.array(z.object({
    personId: z.string(),
    callTime: timeSchema,
    makeupCallTime: timeSchema.nullable().optional(),
    onSetTime: timeSchema.nullable().optional(),
    wrapTime: timeSchema.nullable().optional(),
  })),
})
