import { AsyncLocalStorage } from "node:async_hooks"

// Request-scoped context so the changelog extension knows who made a
// mutation without threading the userId through every query (§2.7).
export interface RequestContext {
  userId?: string
  // Bulk operations (project clone, seed) set this to suppress per-row
  // changelog writes — otherwise a clone floods the log and races the
  // enclosing transaction's commit.
  skipChangelog?: boolean
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export function getCurrentUserId(): string | undefined {
  return requestContext.getStore()?.userId
}

export function isChangelogSuppressed(): boolean {
  return requestContext.getStore()?.skipChangelog === true
}

// Runs `fn` with changelog writes suppressed, preserving the current userId.
export function withoutChangelog<T>(fn: () => Promise<T>): Promise<T> {
  const store = requestContext.getStore()
  return requestContext.run({ ...store, skipChangelog: true }, fn)
}
