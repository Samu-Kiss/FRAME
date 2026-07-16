import { AsyncLocalStorage } from "node:async_hooks"

// Request-scoped context so the changelog extension knows who made a
// mutation without threading the userId through every query (§2.7).
export interface RequestContext {
  userId?: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export function getCurrentUserId(): string | undefined {
  return requestContext.getStore()?.userId
}
