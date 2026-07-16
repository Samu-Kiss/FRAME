// SMPTE semantic color system (§1.7) — colors are information, not decoration.

export const SMPTE = {
  white: "#F0F0F0",
  yellow: "#EFC000",
  cyan: "#00D4DE",
  green: "#00C853",
  magenta: "#CC00AA",
  red: "#FF3530",
  blue: "#2860FF",
} as const

export const SMPTE_LIST = [
  SMPTE.white, SMPTE.yellow, SMPTE.cyan, SMPTE.green, SMPTE.magenta, SMPTE.red, SMPTE.blue,
]

export interface StatusStyle {
  label: string
  color: string
}

export const SHOT_STATUS: Record<string, StatusStyle> = {
  NOT_FILMED: { label: "Not filmed", color: SMPTE.blue },
  IN_PROGRESS: { label: "In progress", color: SMPTE.yellow },
  FILMED: { label: "Filmed", color: SMPTE.green },
  APPROVED: { label: "Approved", color: SMPTE.white },
  DISCARDED: { label: "Discarded", color: SMPTE.magenta },
}

export const TASK_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "Pending", color: SMPTE.blue },
  IN_PROGRESS: { label: "In progress", color: SMPTE.yellow },
  DONE: { label: "Done", color: SMPTE.green },
  BLOCKED: { label: "Blocked", color: SMPTE.red },
  CANCELLED: { label: "Cancelled", color: "#6B6B6B" },
}

export const TASK_PRIORITY: Record<string, StatusStyle> = {
  LOW: { label: "Low", color: "#6B6B6B" },
  MEDIUM: { label: "Medium", color: SMPTE.cyan },
  HIGH: { label: "High", color: SMPTE.yellow },
  URGENT: { label: "Urgent", color: SMPTE.red },
}

export const PROP_STATUS: Record<string, StatusStyle> = {
  SEARCHING: { label: "Searching", color: SMPTE.yellow },
  IN_FABRICATION: { label: "In fabrication", color: SMPTE.cyan },
  CONFIRMED: { label: "Confirmed", color: SMPTE.white },
  IN_STORAGE: { label: "In storage", color: SMPTE.blue },
  ON_SET: { label: "On set", color: SMPTE.green },
  RETURNED: { label: "Returned", color: "#6B6B6B" },
}

export const PERMIT_STATUS: Record<string, StatusStyle> = {
  NOT_REQUIRED: { label: "No permit needed", color: "#6B6B6B" },
  PENDING: { label: "Permit pending", color: SMPTE.red },
  IN_PROCESS: { label: "Permit in process", color: SMPTE.yellow },
  OBTAINED: { label: "Permit obtained", color: SMPTE.green },
}

export const DAY_STATUS: Record<string, StatusStyle> = {
  PLANNED: { label: "Planned", color: SMPTE.blue },
  IN_PROGRESS: { label: "In progress", color: SMPTE.yellow },
  COMPLETED: { label: "Completed", color: SMPTE.green },
  POSTPONED: { label: "Postponed", color: SMPTE.red },
}

export const PROJECT_STATUS: Record<string, StatusStyle> = {
  DEVELOPMENT: { label: "Development", color: SMPTE.cyan },
  PRE_PRODUCTION: { label: "Pre-production", color: SMPTE.yellow },
  PRODUCTION: { label: "Production", color: SMPTE.red },
  POST_PRODUCTION: { label: "Post-production", color: SMPTE.green },
  DELIVERED: { label: "Delivered", color: SMPTE.white },
  ARCHIVED: { label: "Archived", color: "#6B6B6B" },
}

// Department → SMPTE accent (§1.7: cyan photo, green post, magenta art/wardrobe, blue production)
export const DEPARTMENT_COLOR: Record<string, string> = {
  DIRECTION: SMPTE.white,
  PRODUCTION: SMPTE.blue,
  PHOTOGRAPHY: SMPTE.cyan,
  ART: SMPTE.magenta,
  MAKEUP_HAIR: SMPTE.magenta,
  WARDROBE: SMPTE.magenta,
  SOUND: SMPTE.green,
  POST: SMPTE.green,
  TALENT: SMPTE.yellow,
  CLIENT: "#6B6B6B",
  OTHER: "#6B6B6B",
}

export const BLOCK_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  SETUP: { bg: "#1A1A1A", border: "#2E2E2E", text: "#8A8A8A" },
  SHOOTING: { bg: "#08111F", border: SMPTE.blue + "55", text: SMPTE.blue },
  CATERING: { bg: "#141007", border: SMPTE.yellow + "44", text: SMPTE.yellow },
  BREAK: { bg: "#111111", border: "#222222", text: "#6B6B6B" },
  WARDROBE_CHANGE: { bg: "#160B14", border: SMPTE.magenta + "44", text: SMPTE.magenta },
  TRAVEL: { bg: "#061313", border: SMPTE.cyan + "44", text: SMPTE.cyan },
  PICKUP: { bg: "#061313", border: SMPTE.cyan + "44", text: SMPTE.cyan },
  WRAP: { bg: "#101010", border: "#222222", text: "#6B6B6B" },
  OTHER: { bg: "#1A1A1A", border: "#2E2E2E", text: "#8A8A8A" },
}

export function enumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
