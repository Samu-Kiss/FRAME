import { z } from "zod"
import { exportTypeSchema } from "./enums.js"

export const exportRequestSchema = z.object({
  projectId: z.string(),
  type: exportTypeSchema,
  entityId: z.string().optional(), // e.g. ProductionDay.id for CALL_SHEET
  format: z.enum(["pdf", "csv", "png"]).default("pdf"),
})
export type ExportRequestInput = z.infer<typeof exportRequestSchema>
