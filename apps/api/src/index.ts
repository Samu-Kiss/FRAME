// Type-safe barrel — apps/web imports ONLY the AppRouter type from here
// (`import type { AppRouter } from "@frame/api"`), never runtime code (§2.4).
export { appRouter } from "./routers/index.js"
export type { AppRouter } from "./routers/index.js"
export type { Context } from "./context.js"
