"use client"

import { use, useState } from "react"
import { trpc } from "@/lib/trpc"
import { Avatar, Button, Card, MonoChip, Select, Spinner, EmptyState } from "@/components/ui"
import { SMPTE, enumLabel } from "@/lib/theme"

const ACTION_COLOR: Record<string, string> = {
  CREATED: SMPTE.green,
  UPDATED: SMPTE.yellow,
  DELETED: SMPTE.red,
  RESTORED: SMPTE.cyan,
}

const ENTITY_TYPES = ["Project", "Act", "Scene", "Shot", "Person", "Location", "Prop", "Equipment", "ProductionDay", "Task", "Styling", "Shotlist"]

type Diff = { op: string; path: string; value?: unknown; oldValue?: unknown }[]

export default function ChangelogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [entityType, setEntityType] = useState("")
  const query = trpc.changelog.list.useInfiniteQuery(
    { projectId, entityType: entityType || undefined, limit: 30 },
    { getNextPageParam: (last) => last.nextCursor }
  )

  const entries = query.data?.pages.flatMap((p) => p.entries) ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Changelog</h1>
        <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="!w-44">
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>

      {query.isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState title="No changes recorded" hint="Every edit in the project is tracked here automatically." />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-border-dim">
            {entries.map((c) => {
              const diff = (c.diff as Diff | null) ?? []
              return (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.user?.name ?? "System"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-medium">{c.user?.name ?? "System"}</span>{" "}
                        <span style={{ color: ACTION_COLOR[c.action] }}>{c.action.toLowerCase()}</span>{" "}
                        <span className="text-muted">{enumLabel(c.entityType)}</span>
                      </p>
                      {c.namedVersion ? (
                        <div className="mt-1"><MonoChip color={SMPTE.white}>◆ {c.namedVersion}</MonoChip></div>
                      ) : null}
                      {c.note ? <p className="mt-1 text-[11px] italic text-muted">“{c.note}”</p> : null}
                    </div>
                    <span className="font-mono shrink-0 text-[10px] text-faint">
                      {new Date(c.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {diff.length > 0 ? (
                    <div className="mt-2 space-y-0.5 pl-8">
                      {diff.slice(0, 6).map((op, i) => (
                        <p key={i} className="font-mono text-[10px] text-muted">
                          <span className="text-smpte-cyan">{op.path.slice(1)}</span>
                          {"oldValue" in op ? (
                            <>
                              : <span className="text-smpte-red line-through">{shortVal(op.oldValue)}</span>
                              {" → "}
                            </>
                          ) : ": "}
                          <span className="text-smpte-green">{shortVal(op.value)}</span>
                        </p>
                      ))}
                      {diff.length > 6 ? (
                        <p className="font-mono text-[10px] text-faint">+{diff.length - 6} more fields</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {query.hasNextPage ? (
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function shortVal(v: unknown): string {
  if (v === null || v === undefined) return "—"
  const s = typeof v === "object" ? JSON.stringify(v) : String(v)
  return s.length > 42 ? s.slice(0, 42) + "…" : s
}
