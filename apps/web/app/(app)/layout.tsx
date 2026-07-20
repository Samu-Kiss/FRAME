"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { trpc } from "@/lib/trpc"
import { SmpteBar, Logo, Spinner, MonoChip } from "@/components/ui"
import { NotificationBell } from "@/components/notifications"
import { SMPTE } from "@/lib/theme"

const PLAN_COLOR: Record<string, string> = { FREE: "#6B6B6B", PRO: SMPTE.blue, TEAM: SMPTE.cyan }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const sb = supabase()
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login")
      else setAuthed(true)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login")
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  if (!authed) return <Spinner />
  return <Shell>{children}</Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const me = trpc.me.useQuery()

  return (
    <div className="flex min-h-screen flex-col">
      <SmpteBar h={4} />
      <header className="flex items-center justify-between border-b border-border-dim bg-bg-deep px-6 py-3">
        <Link href="/projects">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-4">
          {me.data ? (
            <>
              <MonoChip color={PLAN_COLOR[me.data.plan] ?? "#6B6B6B"}>{me.data.plan}</MonoChip>
              <span className="text-xs text-muted">{me.data.email}</span>
            </>
          ) : null}
          <NotificationBell />
          <button
            title="Sign out"
            className="cursor-pointer text-muted transition-colors hover:text-text"
            onClick={async () => {
              await supabase().auth.signOut()
              router.replace("/login")
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
