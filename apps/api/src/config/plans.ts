import type { PlanTier, ExportType } from "@frame/db"

// Single source of truth for freemium limits (§2.13).
// The API is the only real gate — the frontend only mirrors this for UX.

export interface PlanConfig {
  maxActiveProjects: number
  maxCollaborators: number
  storageMB: number
  changelogRetentionDays: number
  exports: readonly ExportType[] | "all"
  exportsPerDay: number // resolution #6 — was referenced in §2.14 but missing in §2.13
  slateGenerator: boolean
  advancedExports: boolean
  granularPermissions: boolean
}

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  FREE: {
    maxActiveProjects: 1,
    maxCollaborators: 3, // resolution #1 — §1.1 said "none"; §2.13's reasoning wins
    storageMB: 500,
    changelogRetentionDays: 30,
    exports: ["CALL_SHEET", "SHOT_LIST", "SCRIPT"],
    exportsPerDay: 10,
    slateGenerator: false,
    advancedExports: false,
    granularPermissions: false,
  },
  PRO: {
    maxActiveProjects: Infinity,
    maxCollaborators: 15,
    storageMB: 10_000,
    changelogRetentionDays: Infinity,
    exports: "all",
    exportsPerDay: 100,
    slateGenerator: true,
    advancedExports: true,
    granularPermissions: false,
  },
  TEAM: {
    maxActiveProjects: Infinity,
    maxCollaborators: Infinity,
    storageMB: 50_000,
    changelogRetentionDays: Infinity,
    exports: "all",
    exportsPerDay: Infinity,
    slateGenerator: true,
    advancedExports: true,
    granularPermissions: true,
  },
}

export function exportAllowed(plan: PlanTier, type: ExportType): boolean {
  const allowed = PLAN_LIMITS[plan].exports
  return allowed === "all" || allowed.includes(type)
}
