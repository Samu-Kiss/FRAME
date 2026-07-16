import { prisma } from "@frame/db"
import { verifyToken, type AuthUser } from "./lib/supabase.js"

// Type alias (not interface) so it satisfies @hono/trpc-server's
// Record<string, unknown> context constraint.
export type Context = {
  user: AuthUser | null
  prisma: typeof prisma
}

export async function createContext(req: Request): Promise<Context> {
  const header = req.headers.get("authorization") ?? undefined
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined
  const user = await verifyToken(token)
  return { user, prisma }
}
