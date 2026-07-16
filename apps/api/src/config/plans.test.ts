import { describe, it, expect } from "vitest"
import { PLAN_LIMITS, exportAllowed } from "./plans.js"

describe("PLAN_LIMITS", () => {
  it("free tier is strictly more restrictive than pro", () => {
    expect(PLAN_LIMITS.FREE.maxActiveProjects).toBeLessThan(PLAN_LIMITS.PRO.maxActiveProjects)
    expect(PLAN_LIMITS.FREE.maxCollaborators).toBeLessThan(PLAN_LIMITS.PRO.maxCollaborators)
    expect(PLAN_LIMITS.FREE.storageMB).toBeLessThan(PLAN_LIMITS.PRO.storageMB)
    expect(PLAN_LIMITS.FREE.exportsPerDay).toBeLessThan(PLAN_LIMITS.PRO.exportsPerDay)
  })

  it("pro is at most as restrictive as team", () => {
    expect(PLAN_LIMITS.PRO.maxCollaborators).toBeLessThanOrEqual(PLAN_LIMITS.TEAM.maxCollaborators)
    expect(PLAN_LIMITS.PRO.storageMB).toBeLessThanOrEqual(PLAN_LIMITS.TEAM.storageMB)
    expect(PLAN_LIMITS.PRO.exportsPerDay).toBeLessThanOrEqual(PLAN_LIMITS.TEAM.exportsPerDay)
  })

  it("only team gets granular permissions (§2.13)", () => {
    expect(PLAN_LIMITS.FREE.granularPermissions).toBe(false)
    expect(PLAN_LIMITS.PRO.granularPermissions).toBe(false)
    expect(PLAN_LIMITS.TEAM.granularPermissions).toBe(true)
  })

  it("every tier defines exportsPerDay (resolution #6)", () => {
    for (const plan of Object.values(PLAN_LIMITS)) {
      expect(plan.exportsPerDay).toBeGreaterThan(0)
    }
  })

  it("free tier only exports call sheet, shot list and script", () => {
    expect(exportAllowed("FREE", "CALL_SHEET")).toBe(true)
    expect(exportAllowed("FREE", "SHOT_LIST")).toBe(true)
    expect(exportAllowed("FREE", "SCRIPT")).toBe(true)
    expect(exportAllowed("FREE", "STRIPBOARD")).toBe(false)
    expect(exportAllowed("FREE", "SLATE_PNG")).toBe(false)
    expect(exportAllowed("PRO", "STRIPBOARD")).toBe(true)
  })
})
