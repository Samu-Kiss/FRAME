"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, AtSign, MessageSquare, CheckSquare, Check } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Avatar } from "@/components/ui"
import { SMPTE } from "@/lib/theme"

const TYPE_ICON = {
  MENTION: AtSign,
  COMMENT: MessageSquare,
  TASK_ASSIGNED: CheckSquare,
}
const TYPE_COLOR = {
  MENTION: SMPTE.cyan,
  COMMENT: SMPTE.blue,
  TASK_ASSIGNED: SMPTE.yellow,
}

// Where a notification links to — most resolve to the entity's module.
function hrefFor(n: { projectId: string; entityType: string; entityId: string }): string {
  const base = `/projects/${n.projectId}`
  switch (n.entityType) {
    case "Task":
      return `${base}/people`
    case "Shot":
    case "Scene":
      return `${base}/shotlist`
    case "Location":
      return `${base}/locations`
    case "Prop":
      return `${base}/props`
    case "Styling":
      return `${base}/stylings`
    case "Equipment":
      return `${base}/equipment`
    case "ProductionDay":
      return `${base}/schedule`
    default:
      return base
  }
}

export function NotificationBell() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // light polling keeps the badge fresh without realtime infra (MVP+)
  const query = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30_000 })
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() })
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() })

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [open])

  const unread = query.data?.unread ?? 0
  const items = query.data?.items ?? []

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative cursor-pointer text-muted transition-colors hover:text-text"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
      >
        <Bell size={15} />
        {unread > 0 ? (
          <span
            className="font-mono absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[8px] font-bold text-bg"
            style={{ background: SMPTE.red }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-8 z-50 w-80 overflow-hidden rounded-md border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border-dim px-4 py-2.5">
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.12em]">Notifications</span>
            {unread > 0 ? (
              <button
                className="font-mono flex items-center gap-1 cursor-pointer text-[9px] uppercase tracking-wider text-muted hover:text-text"
                onClick={() => markAll.mutate()}
              >
                <Check size={10} /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-faint">You&apos;re all caught up.</p>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICON[n.type]
                return (
                  <button
                    key={n.id}
                    className={`flex w-full items-start gap-2.5 border-b border-border-dim px-4 py-2.5 text-left transition-colors hover:bg-surface-2 ${n.read ? "opacity-60" : ""}`}
                    onClick={() => {
                      if (!n.read) markRead.mutate({ notificationId: n.id })
                      setOpen(false)
                      router.push(hrefFor(n))
                    }}
                  >
                    <div className="mt-0.5 shrink-0"><Icon size={13} style={{ color: TYPE_COLOR[n.type] }} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-snug text-text/90">{n.message}</p>
                      <p className="font-mono mt-1 text-[9px] text-faint">
                        {n.project.title} · {new Date(n.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SMPTE.red }} /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
