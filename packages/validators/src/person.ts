import { z } from "zod"
import {
  departmentSchema, personTypeSchema, crewTypeSchema, richTextSchema, timeSchema,
} from "./enums.js"

const personBase = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  department: departmentSchema,
  role: z.string().min(1).max(100),
  callTime: timeSchema.nullable().optional(),
  notes: richTextSchema.nullable().optional(),
})

export const talentDetailsSchema = z.object({
  characterName: z.string().max(200).nullable().optional(),
  agencyName: z.string().max(200).nullable().optional(),
  agencyContact: z.string().max(200).nullable().optional(),
  measurements: z.record(z.string(), z.unknown()).nullable().optional(),
  portfolio: z.array(z.string().url()).optional(),
})

export const crewDetailsSchema = z.object({
  crewType: crewTypeSchema,
  vehicle: z.string().max(100).nullable().optional(),
})

export const postCrewDetailsSchema = z.object({
  deliverables: z.array(z.string()).optional(),
  software: z.array(z.string()).optional(),
})

export const clientDetailsSchema = z.object({
  companyName: z.string().min(1).max(200),
  position: z.string().max(200).nullable().optional(),
  approvalRequired: z.boolean().optional(),
})

export const personCreateSchema = z.object({
  projectId: z.string(),
  type: personTypeSchema,
  talent: talentDetailsSchema.optional(),
  crew: crewDetailsSchema.optional(),
  postCrew: postCrewDetailsSchema.optional(),
  client: clientDetailsSchema.optional(),
}).merge(personBase).superRefine((val, ctx) => {
  if (val.type === "CREW" && !val.crew) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "crew details required for CREW", path: ["crew"] })
  }
  if (val.type === "CLIENT" && !val.client) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "client details required for CLIENT", path: ["client"] })
  }
})

export const personUpdateSchema = z.object({
  projectId: z.string(),
  personId: z.string(),
  data: personBase.partial(),
  talent: talentDetailsSchema.optional(),
  crew: crewDetailsSchema.partial().optional(),
  postCrew: postCrewDetailsSchema.optional(),
  client: clientDetailsSchema.partial().optional(),
})
