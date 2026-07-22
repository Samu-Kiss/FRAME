"use client"

import { useEffect, useState } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { trpc } from "@/lib/trpc"
import { Avatar } from "@/components/ui"
import { SMPTE } from "@/lib/theme"

interface Peer {
  userId: string
  name: string
  at: number
}

// Live presence over Supabase Realtime (v2.0 §1.10). One channel per
// project; each viewer tracks themselves and sees everyone else's avatar.
// Presence is broadcast-based — needs no DB tables or RLS.
export function PresenceBar({ projectId }: { projectId: string }) {
  const me = trpc.me.useQuery()
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    if (!me.data) return
    const sb = supabase()
    const channel: RealtimeChannel = sb.channel(`presence:project:${projectId}`, {
      config: { presence: { key: me.data.id } },
    })

    const sync = () => {
      const state = channel.presenceState<Peer>()
      const seen = new Map<string, Peer>()
      for (const key of Object.keys(state)) {
        const entry = state[key]?.[0]
        if (entry && entry.userId !== me.data!.id) seen.set(entry.userId, entry)
      }
      setPeers([...seen.values()].sort((a, b) => a.at - b.at))
    }

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: me.data!.id, name: me.data!.name, at: Date.now() })
        }
      })

    return () => {
      channel.untrack()
      sb.removeChannel(channel)
    }
  }, [projectId, me.data])

  if (peers.length === 0) return null

  return (
    <div className="flex items-center gap-1.5" title={`Also here: ${peers.map((p) => p.name).join(", ")}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: SMPTE.green }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: SMPTE.green }} />
      </span>
      <div className="flex -space-x-1.5">
        {peers.slice(0, 5).map((p) => (
          <div key={p.userId} className="rounded-full ring-1 ring-bg-deep">
            <Avatar name={p.name} size={20} />
          </div>
        ))}
      </div>
      {peers.length > 5 ? <span className="font-mono text-[10px] text-muted">+{peers.length - 5}</span> : null}
    </div>
  )
}
