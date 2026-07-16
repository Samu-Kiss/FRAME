import { z } from "zod"

export const slateFieldSchema = z.object({
  fieldKey: z.enum([
    "production", "director", "dop", "date", "scene", "shot", "take",
    "roll", "camera", "lens", "filter", "fps", "format", "custom",
  ]),
  label: z.string().min(1).max(40),
  valueSource: z.enum(["auto", "manual"]),
  autoRef: z.string().max(100).optional(),
  manualValue: z.string().max(120).optional(),
  enabled: z.boolean().optional(),
})

export const slateConfigSchema = z.object({
  enabled: z.boolean(),
  layout: z.enum(["standard", "minimal", "custom"]),
  fields: z.array(slateFieldSchema).max(20),
})

export const slateSaveSchema = z.object({
  projectId: z.string(),
  shotId: z.string(),
  config: slateConfigSchema,
})
