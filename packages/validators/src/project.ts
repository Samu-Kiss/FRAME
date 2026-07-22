import { z } from "zod"
import { projectTypeSchema, projectStatusSchema, richTextSchema } from "./enums.js"

export const permissionSetSchema = z.object({
  canEditScript: z.boolean(),
  canEditShotlist: z.boolean(),
  canEditCameraData: z.boolean(),
  canEditSchedule: z.boolean(),
  canEditPeople: z.boolean(),
  canEditLocations: z.boolean(),
  canEditStyling: z.boolean(),
  canEditProps: z.boolean(),
  canExport: z.boolean(),
  canManageMembers: z.boolean(),
  isAdmin: z.boolean(),
})
export type PermissionSet = z.infer<typeof permissionSetSchema>

export const FULL_PERMISSIONS: PermissionSet = {
  canEditScript: true,
  canEditShotlist: true,
  canEditCameraData: true,
  canEditSchedule: true,
  canEditPeople: true,
  canEditLocations: true,
  canEditStyling: true,
  canEditProps: true,
  canExport: true,
  canManageMembers: true,
  isAdmin: true,
}

export const READ_ONLY_PERMISSIONS: PermissionSet = {
  canEditScript: false,
  canEditShotlist: false,
  canEditCameraData: false,
  canEditSchedule: false,
  canEditPeople: false,
  canEditLocations: false,
  canEditStyling: false,
  canEditProps: false,
  canExport: false,
  canManageMembers: false,
  isAdmin: false,
}

export const dateRangeSchema = z.object({
  start: z.string(), // ISO date
  end: z.string(),
})

export const projectCreateSchema = z.object({
  title: z.string().min(1).max(200),
  type: projectTypeSchema,
  client: z.string().max(200).optional(),
  brand: z.string().max(200).optional(),
  description: richTextSchema.optional(),
  shootDates: z.array(dateRangeSchema).optional(),
})
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>

// v2.0: create blank, clone an own project, or copy the demo template (§1.10)
export const projectCreateFromTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  source: z.enum(["clone", "demo"]),
  sourceProjectId: z.string(), // own project to clone, or the demo template id
})

export const projectUpdateSchema = z.object({
  projectId: z.string(),
  data: projectCreateSchema.partial().extend({
    status: projectStatusSchema.optional(),
  }),
})

export const scriptUpdateSchema = z.object({
  projectId: z.string(),
  content: z.record(z.string(), z.unknown()), // TipTap doc of screenplay blocks
})

export const memberAddSchema = z.object({
  projectId: z.string(),
  email: z.string().email(),
  projectRole: z.string().min(1).max(100),
  permissions: permissionSetSchema,
})

export const memberUpdateSchema = z.object({
  projectId: z.string(),
  memberId: z.string(),
  projectRole: z.string().min(1).max(100).optional(),
  permissions: permissionSetSchema.optional(),
})
