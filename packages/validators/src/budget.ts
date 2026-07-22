import { z } from "zod"

export const budgetCategorySchema = z.enum([
  "CAST", "CREW", "LOCATIONS", "EQUIPMENT", "ART_PROPS", "WARDROBE_MAKEUP",
  "TRANSPORT", "CATERING", "POST", "INSURANCE", "CONTINGENCY", "OTHER",
])

const budgetFields = z.object({
  category: budgetCategorySchema,
  label: z.string().min(1).max(200),
  estimated: z.number().min(0),
  actual: z.number().min(0).nullable().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().max(40).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const budgetItemCreateSchema = z.object({ projectId: z.string() }).merge(budgetFields)

export const budgetItemUpdateSchema = z.object({
  projectId: z.string(),
  itemId: z.string(),
  data: budgetFields.partial(),
})
