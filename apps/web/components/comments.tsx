"use client"

import { useMemo, useState } from "react"
import { MessageSquare, Trash2, Send } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { Avatar, Button, ErrorNote, SectionLabel } from "@/components/ui"
import { useI18n } from "@/lib/i18n"
import { SMPTE } from "@/lib/theme"

type CommentableType =
  | "Shot" | "Scene" | "Task" | "Location" | "Prop" | "Styling" | "Person" | "Equipment" | "ProductionDay"

// @mention picker: parses "@name" at the caret against project members.
function extractMentions(body: string, members: { userId: string; name: string }[]): string[] {
  const ids: string[] = []
  for (const m of members) {
    // match @First or @First Last (loosely) — first name is enough
    const first = m.name.split(" ")[0]!
    const re = new RegExp(`@${first}\\b`, "i")
    if (re.test(body)) ids.push(m.userId)
  }
  return [...new Set(ids)]
}

export function CommentThread({
  projectId,
  entityType,
  entityId,
}: {
  projectId: string
  entityType: CommentableType
  entityId: string
}) {
  const utils = trpc.useUtils()
  const { t } = useI18n()
  const comments = trpc.comments.list.useQuery({ projectId, entityType, entityId })
  const project = trpc.project.get.useQuery({ projectId })
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  const members = useMemo(
    () => (project.data?.members ?? []).map((m) => ({ userId: m.user.id, name: m.user.name })),
    [project.data]
  )

  const invalidate = () => utils.comments.list.invalidate({ projectId, entityType, entityId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const create = trpc.comments.create.useMutation({
    onSuccess: () => { invalidate(); setBody(""); setError(null); utils.notifications.list.invalidate() },
    onError,
  })
  const remove = trpc.comments.delete.useMutation({ onSuccess: invalidate, onError })

  const list = comments.data ?? []

  return (
    <div>
      <SectionLabel label={`${t("comments.discussion")} · ${list.length}`} color={SMPTE.cyan} />

      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="flex items-center gap-2 py-1 text-[11px] text-faint">
            <MessageSquare size={12} /> {t("comments.empty")}
          </p>
        ) : (
          list.map((c) => (
            <div key={c.id} className="group flex gap-2.5">
              <Avatar name={c.user.name} size={26} />
              <div className="min-w-0 flex-1 rounded-[4px] border border-border-dim bg-surface-2 px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-display text-[11px] font-semibold">{c.user.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-faint">
                      {new Date(c.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                      onClick={() => remove.mutate({ projectId, commentId: c.id })}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-text/90">
                  {highlightMentions(c.body, members)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="mt-3 flex items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!body.trim()) return
          create.mutate({ projectId, entityType, entityId, body: body.trim(), mentions: extractMentions(body, members) })
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("comments.placeholder")}
          rows={2}
          className="min-h-10 flex-1 rounded-[3px] border border-border bg-surface-2 px-3 py-2 text-xs text-text placeholder:text-faint focus:border-smpte-cyan/60 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              if (body.trim()) create.mutate({ projectId, entityType, entityId, body: body.trim(), mentions: extractMentions(body, members) })
            }
          }}
        />
        <Button type="submit" disabled={create.isPending || !body.trim()} className="!px-3 !py-2">
          <Send size={13} />
        </Button>
      </form>
      <ErrorNote message={error} />
    </div>
  )
}

// Renders @mentions of real members in cyan.
function highlightMentions(body: string, members: { name: string }[]): React.ReactNode {
  const firstNames = members.map((m) => m.name.split(" ")[0]!).filter(Boolean)
  if (!firstNames.length) return body
  const re = new RegExp(`(@(?:${firstNames.map(escapeRe).join("|")}))\\b`, "gi")
  const parts = body.split(re)
  return parts.map((part, i) =>
    /^@/.test(part) && firstNames.some((n) => n.toLowerCase() === part.slice(1).toLowerCase()) ? (
      <span key={i} className="font-medium text-smpte-cyan">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
