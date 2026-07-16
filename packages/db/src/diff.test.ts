import { describe, it, expect } from "vitest"
import { computeDiff } from "./diff.js"

describe("computeDiff", () => {
  it("returns empty diff for identical snapshots", () => {
    expect(computeDiff({ a: 1, b: "x" }, { a: 1, b: "x" })).toEqual([])
  })

  it("detects replaced scalar fields", () => {
    const diff = computeDiff({ status: "NOT_FILMED" }, { status: "FILMED" })
    expect(diff).toEqual([
      { op: "replace", path: "/status", value: "FILMED", oldValue: "NOT_FILMED" },
    ])
  })

  it("ignores createdAt/updatedAt noise", () => {
    const diff = computeDiff(
      { updatedAt: new Date("2026-01-01"), title: "a" },
      { updatedAt: new Date("2026-02-02"), title: "a" }
    )
    expect(diff).toEqual([])
  })

  it("compares dates by value", () => {
    const diff = computeDiff(
      { dueDate: new Date("2026-01-01T00:00:00Z") },
      { dueDate: new Date("2026-01-01T00:00:00Z") }
    )
    expect(diff).toEqual([])
  })

  it("compares JSON columns structurally", () => {
    const diff = computeDiff(
      { notes: { type: "doc", content: [] } },
      { notes: { type: "doc", content: [{ t: "p" }] } }
    )
    expect(diff).toHaveLength(1)
    expect(diff[0]?.op).toBe("replace")
    expect(diff[0]?.path).toBe("/notes")
  })

  it("handles added and removed fields", () => {
    const diff = computeDiff({ a: 1 }, { b: 2 })
    expect(diff).toContainEqual({ op: "remove", path: "/a", oldValue: 1 })
    expect(diff).toContainEqual({ op: "add", path: "/b", value: 2 })
  })

  it("handles null before (create-like)", () => {
    const diff = computeDiff(null, { title: "New" })
    expect(diff).toEqual([{ op: "add", path: "/title", value: "New" }])
  })
})
