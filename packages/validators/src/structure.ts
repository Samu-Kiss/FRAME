import { z } from "zod"
import {
  daylightTypeSchema, shotStatusSchema, frameSizeSchema, cameraMovementSchema,
  cameraAngleSchema, richTextSchema,
} from "./enums.js"

export const actCreateSchema = z.object({
  projectId: z.string(),
  number: z.number().int().min(1),
  title: z.string().max(200).optional(),
  description: richTextSchema.optional(),
})

export const actUpdateSchema = z.object({
  projectId: z.string(),
  actId: z.string(),
  data: z.object({
    number: z.number().int().min(1).optional(),
    title: z.string().max(200).nullable().optional(),
    description: richTextSchema.nullable().optional(),
    order: z.number().int().optional(),
  }),
})

export const sceneCreateSchema = z.object({
  projectId: z.string(),
  actId: z.string(),
  number: z.string().min(1).max(10),
  title: z.string().min(1).max(200),
  synopsis: richTextSchema.optional(),
  locationId: z.string().nullable().optional(),
  daylight: daylightTypeSchema.optional(),
  estimatedDuration: z.number().int().min(0).nullable().optional(),
})

export const sceneUpdateSchema = z.object({
  projectId: z.string(),
  sceneId: z.string(),
  data: z.object({
    number: z.string().min(1).max(10).optional(),
    title: z.string().min(1).max(200).optional(),
    synopsis: richTextSchema.nullable().optional(),
    locationId: z.string().nullable().optional(),
    daylight: daylightTypeSchema.optional(),
    estimatedDuration: z.number().int().min(0).nullable().optional(),
    status: shotStatusSchema.optional(),
    notes: richTextSchema.nullable().optional(),
    order: z.number().int().optional(),
  }),
})

const shotFields = z.object({
  shotNumber: z.string().min(1).max(20),
  shotName: z.string().min(1).max(200),
  description: richTextSchema.nullable().optional(),
  frameSize: frameSizeSchema.nullable().optional(),
  lensSize: z.string().max(50).nullable().optional(),
  cameraMovements: z.array(cameraMovementSchema).optional(),
  cameraAngle: cameraAngleSchema.nullable().optional(),
  voiceover: richTextSchema.nullable().optional(),
  soundEffects: z.array(z.string()).optional(),
  musicRef: z.string().max(300).nullable().optional(),
  estimatedDuration: z.number().int().min(0).nullable().optional(),
  filmed: z.boolean().optional(),
  takes: z.number().int().min(0).nullable().optional(),
  selectedTake: z.number().int().min(0).nullable().optional(),
  postNotes: richTextSchema.nullable().optional(),
  notes: richTextSchema.nullable().optional(),
  status: shotStatusSchema.optional(),
  order: z.number().int().optional(),
})

export const shotCreateSchema = z.object({
  projectId: z.string(),
  sceneId: z.string(),
}).merge(shotFields.pick({ shotNumber: true, shotName: true })).extend({
  description: richTextSchema.optional(),
  frameSize: frameSizeSchema.optional(),
})

export const shotUpdateSchema = z.object({
  projectId: z.string(),
  shotId: z.string(),
  data: shotFields.partial(),
})

export const shotPeopleSetSchema = z.object({
  projectId: z.string(),
  shotId: z.string(),
  people: z.array(z.object({
    personId: z.string(),
    role: z.string().max(100).nullable().optional(),
    action: z.string().max(300).nullable().optional(),
    emotion: z.string().max(100).nullable().optional(),
  })),
})

export const shotRelationSetSchema = z.object({
  projectId: z.string(),
  shotId: z.string(),
  ids: z.array(z.string()),
})
