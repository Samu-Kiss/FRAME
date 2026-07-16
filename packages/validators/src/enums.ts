import { z } from "zod"

// Mirrors of the Prisma enums. Kept as literals so the validators
// package has zero dependency on the generated Prisma client.

export const projectTypeSchema = z.enum([
  "COMMERCIAL", "MUSIC_VIDEO", "SHORT_FILM", "FEATURE_FILM", "DOCUMENTARY", "CONTENT", "OTHER",
])
export const projectStatusSchema = z.enum([
  "DEVELOPMENT", "PRE_PRODUCTION", "PRODUCTION", "POST_PRODUCTION", "DELIVERED", "ARCHIVED",
])
export const departmentSchema = z.enum([
  "DIRECTION", "PRODUCTION", "PHOTOGRAPHY", "ART", "MAKEUP_HAIR", "WARDROBE", "SOUND", "POST", "TALENT", "CLIENT", "OTHER",
])
export const personTypeSchema = z.enum(["TALENT", "CREW", "POST_CREW", "CLIENT"])
export const crewTypeSchema = z.enum(["HEAD_OF_DEPARTMENT", "OPERATOR", "ASSISTANT"])
export const daylightTypeSchema = z.enum([
  "DAWN", "MORNING", "MIDDAY", "AFTERNOON", "SUNSET", "NIGHT", "DEEP_NIGHT", "STUDIO",
])
export const frameSizeSchema = z.enum([
  "ECU", "CU", "MCU", "MS", "MLS", "LS", "ELS", "AERIAL", "POV", "OTS", "TWO_SHOT", "INSERT", "OTHER",
])
export const cameraMovementSchema = z.enum([
  "STATIC", "PAN", "TILT", "DOLLY", "STEADICAM", "HANDHELD", "DRONE", "CRANE", "ZOOM", "PUSH_IN", "PULL_OUT", "ARC", "OTHER",
])
export const cameraAngleSchema = z.enum([
  "EYE_LEVEL", "HIGH_ANGLE", "LOW_ANGLE", "DUTCH", "BIRDS_EYE", "WORMS_EYE",
])
export const shotStatusSchema = z.enum([
  "NOT_FILMED", "IN_PROGRESS", "FILMED", "APPROVED", "DISCARDED",
])
export const locationTypeSchema = z.enum([
  "INTERIOR", "EXTERIOR", "STUDIO", "NATURAL", "URBAN", "RURAL", "WATER", "OTHER",
])
export const permitStatusSchema = z.enum(["NOT_REQUIRED", "PENDING", "IN_PROCESS", "OBTAINED"])
export const propCategorySchema = z.enum([
  "PROP", "SET_DRESSING", "VEHICLE", "FOOD", "WEAPON", "DOCUMENT", "TECH", "OTHER",
])
export const propStatusSchema = z.enum([
  "SEARCHING", "IN_FABRICATION", "CONFIRMED", "IN_STORAGE", "ON_SET", "RETURNED",
])
export const propSourceSchema = z.enum(["OWN", "RENTED", "PURCHASED", "BORROWED"])
export const stylingItemStatusSchema = z.enum(["SEARCHING", "CONFIRMED", "ON_LOAN", "PURCHASED"])
export const equipmentTypeSchema = z.enum([
  "CAMERA", "LENS", "STEADICAM", "SLIDER", "DRONE", "LIGHTING", "SOUND", "GRIP", "OTHER",
])
export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELLED"])
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
export const scheduleBlockTypeSchema = z.enum([
  "SETUP", "SHOOTING", "CATERING", "BREAK", "WARDROBE_CHANGE", "TRAVEL", "PICKUP", "WRAP", "OTHER",
])
export const productionDayStatusSchema = z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "POSTPONED"])
export const exportTypeSchema = z.enum([
  "CALL_SHEET", "SHOT_LIST", "PRODUCTION_SCHEDULE", "SCENE_BREAKDOWN", "SCRIPT",
  "STRIPBOARD", "TALENT_SCHEDULE", "PROPS_LIST", "EQUIPMENT_LIST", "SLATE_PDF", "SLATE_PNG",
])

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM")
export const richTextSchema = z.record(z.string(), z.unknown()) // TipTap JSON doc
