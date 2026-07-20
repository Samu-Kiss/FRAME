"use client"

import { use, useState } from "react"
import { Download, FileText, Lock, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { Card, EmptyState, ErrorNote, MonoChip, SectionLabel, Spinner } from "@/components/ui"
import { SMPTE, enumLabel } from "@/lib/theme"

type ExportType =
  | "CALL_SHEET" | "SHOT_LIST" | "PRODUCTION_SCHEDULE" | "SCENE_BREAKDOWN" | "SCRIPT"
  | "STRIPBOARD" | "TALENT_SCHEDULE" | "PROPS_LIST" | "EQUIPMENT_LIST"

interface ExportDef {
  type: ExportType
  label: string
  desc: string
  formats: ("pdf" | "csv")[]
  needsDay?: boolean // requires selecting a production day
  advanced?: boolean // Pro/Team only
}

const EXPORTS: ExportDef[] = [
  { type: "CALL_SHEET", label: "Call Sheet", desc: "Per shoot day: call times, locations, schedule, contacts.", formats: ["pdf"], needsDay: true },
  { type: "SHOT_LIST", label: "Shot List", desc: "Master list of every shot with all relevant fields.", formats: ["pdf", "csv"] },
  { type: "SCRIPT", label: "Script", desc: "Screenplay in industry-standard format.", formats: ["pdf"] },
  { type: "PRODUCTION_SCHEDULE", label: "Production Schedule", desc: "Full timeline across days with parallel blocks.", formats: ["pdf"], advanced: true },
  { type: "SCENE_BREAKDOWN", label: "Scene Breakdown", desc: "Cast, props, styling and equipment per scene.", formats: ["pdf"], advanced: true },
  { type: "STRIPBOARD", label: "Stripboard", desc: "Colored scene strips by shoot day.", formats: ["pdf"], advanced: true },
  { type: "TALENT_SCHEDULE", label: "Talent Schedule", desc: "Per-talent call times across all days.", formats: ["pdf"], advanced: true },
  { type: "PROPS_LIST", label: "Props List", desc: "Every prop with status, source and scenes.", formats: ["pdf", "csv"], advanced: true },
  { type: "EQUIPMENT_LIST", label: "Equipment List", desc: "Gear by type, assignment and rental source.", formats: ["pdf", "csv"], advanced: true },
]

export default function ExportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const me = trpc.me.useQuery()
  const days = trpc.productionDay.list.useQuery({ projectId })
  const jobs = trpc.exports.list.useQuery({ projectId })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [dayId, setDayId] = useState<string>("")

  const utils = trpc.useUtils()
  const requestExport = trpc.exports.request.useMutation({
    onSuccess: (r) => { window.open(r.url, "_blank"); utils.exports.list.invalidate({ projectId }); setPending(null) },
    onError: (e) => { setError(parseApiError(e)); setPending(null) },
  })

  const advancedAllowed = me.data?.limits.advancedExports ?? false
  const allExports = me.data?.limits.exports

  if (me.isLoading) return <Spinner />

  const isAllowed = (d: ExportDef) => {
    if (allExports === "all") return true
    if (d.advanced && !advancedAllowed) return false
    return true
  }

  const run = (d: ExportDef, format: "pdf" | "csv") => {
    setError(null)
    if (d.needsDay && !dayId) { setError("Select a production day first."); return }
    setPending(`${d.type}:${format}`)
    requestExport.mutate({
      projectId,
      type: d.type as never,
      format,
      entityId: d.needsDay ? dayId : undefined,
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Exports</h1>
        {!advancedAllowed ? (
          <MonoChip color={SMPTE.yellow}>Upgrade to Pro for advanced exports</MonoChip>
        ) : null}
      </div>

      <ErrorNote message={error} />

      <div className="mb-6">
        <SectionLabel label="Call sheet — pick a day" color={SMPTE.blue} />
        <select
          value={dayId}
          onChange={(e) => setDayId(e.target.value)}
          className="w-full max-w-md rounded-[3px] border border-border bg-surface-2 px-3 py-2 text-sm focus:border-smpte-cyan/60 focus:outline-none"
        >
          <option value="">Select production day…</option>
          {(days.data ?? []).map((d, i) => (
            <option key={d.id} value={d.id}>
              Day {i + 1} — {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.map((d) => {
          const allowed = isAllowed(d)
          return (
            <Card key={d.type} className={`flex flex-col ${allowed ? "" : "opacity-50"}`}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} style={{ color: SMPTE.white }} />
                  <h2 className="font-display text-xs font-bold">{d.label}</h2>
                </div>
                {d.advanced ? <MonoChip color={allowed ? SMPTE.blue : "#6B6B6B"}>PRO</MonoChip> : null}
              </div>
              <p className="mb-3 flex-1 text-[11px] leading-relaxed text-muted">{d.desc}</p>
              <div className="flex gap-2">
                {allowed ? (
                  d.formats.map((fmt) => {
                    const key = `${d.type}:${fmt}`
                    return (
                      <button
                        key={fmt}
                        disabled={pending === key}
                        onClick={() => run(d, fmt)}
                        className="font-display flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text transition-colors hover:border-muted disabled:opacity-50"
                      >
                        {pending === key ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        {fmt}
                      </button>
                    )
                  })
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] text-faint">
                    <Lock size={11} /> Pro / Team
                  </span>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-8">
        <SectionLabel label="Recent exports" color={SMPTE.green} />
        {jobs.data?.length ? (
          <Card className="!p-0">
            <ul className="divide-y divide-border-dim">
              {jobs.data.map((j) => (
                <li key={j.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  <MonoChip color={j.status === "DONE" ? SMPTE.green : j.status === "FAILED" ? SMPTE.red : SMPTE.yellow}>
                    {j.status}
                  </MonoChip>
                  <span className="flex-1">{enumLabel(j.type)}</span>
                  <span className="text-muted">{j.user.name}</span>
                  <span className="font-mono text-[10px] text-faint">
                    {new Date(j.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {j.fileUrl && j.status === "DONE" ? (
                    <a href={j.fileUrl} target="_blank" rel="noreferrer" className="text-smpte-cyan hover:underline">
                      open
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState title="No exports yet" hint="Generate a document above — it appears here and downloads automatically." />
        )}
      </div>
    </div>
  )
}
