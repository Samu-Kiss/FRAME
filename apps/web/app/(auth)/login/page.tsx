"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button, Card, Field, Input, ErrorNote } from "@/components/ui"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else router.replace("/projects")
  }

  return (
    <Card>
      <h1 className="font-display mb-5 text-center text-sm font-bold uppercase tracking-[0.2em]">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@production.co" />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">
        No account?{" "}
        <Link href="/register" className="text-smpte-cyan hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-2 text-center text-[10px] text-faint">
        Demo: demo@frame.app / frame-demo-1234
      </p>
    </Card>
  )
}
