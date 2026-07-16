// JSONPatch-like diff between two flat entity snapshots.
// Used by the changelog extension — only own enumerable fields are
// compared, nested objects/arrays are compared by value (JSON).

export interface DiffOp {
  op: "replace" | "add" | "remove"
  path: string
  value?: unknown
  oldValue?: unknown
}

const IGNORED_KEYS = new Set(["createdAt", "updatedAt"])

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  return value
}

function equal(a: unknown, b: unknown): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true
  if (na === null || nb === null || na === undefined || nb === undefined) return false
  if (typeof na === "object" && typeof nb === "object") {
    return JSON.stringify(na) === JSON.stringify(nb)
  }
  return false
}

export function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): DiffOp[] {
  const ops: DiffOp[] = []
  const b = before ?? {}
  const a = after ?? {}
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])

  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue
    const oldValue = b[key]
    const value = a[key]
    // Relations arrive as objects/arrays when queries use include —
    // skip them, the changelog tracks scalar state per entity.
    if (typeof value === "function" || typeof oldValue === "function") continue
    if (equal(oldValue, value)) continue

    if (oldValue === undefined) {
      ops.push({ op: "add", path: `/${key}`, value: normalize(value) })
    } else if (value === undefined) {
      ops.push({ op: "remove", path: `/${key}`, oldValue: normalize(oldValue) })
    } else {
      ops.push({ op: "replace", path: `/${key}`, value: normalize(value), oldValue: normalize(oldValue) })
    }
  }
  return ops
}
