"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button, Card, Field, Input, ErrorNote } from "@/components/ui"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    setLoading(false)
    if (error) setError(error.message)
    else router.replace("/projects")
  }

  return (
    <Card>
      <h1 className="font-display mb-5 text-center text-sm font-bold uppercase tracking-[0.2em]">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Ana Riera" />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@production.co" />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">
        Already registered?{" "}
        <Link href="/login" className="text-smpte-cyan hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
