import { createClient } from "@supabase/supabase-js"
import { env } from "../env.js"

// Service-role client — lives ONLY in the API (§2.11). Bypasses RLS.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export interface AuthUser {
  id: string
  email: string
  name: string
}

export async function verifyToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  const u = data.user
  return {
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string | undefined) ?? u.email?.split("@")[0] ?? "User",
  }
}
