"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Save } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { Button, ErrorNote, MonoChip, SectionLabel, Spinner } from "@/components/ui"
import { SMPTE, SMPTE_LIST } from "@/lib/theme"

type Resolved = RouterOutputs["slate"]["resolve"]
type FieldCfg = Resolved["config"]["fields"][number]

const BIG_KEYS = ["scene", "shot", "take"]

export default function SlatePage({ params }: { params: Promise<{ id: string; shotId: string }> }) {
  const { id: projectId, shotId } = use(params)
  const resolved = trpc.slate.resolve.useQuery({ projectId, shotId })
  if (resolved.isLoading || !resolved.data) return <Spinner />
  return <SlateEditor key={shotId} projectId={projectId} shotId={shotId} initial={resolved.data} />
}

function SlateEditor({
  projectId, shotId, initial,
}: {
  projectId: string
  shotId: string
  initial: Resolved
}) {
  const [fields, setFields] = useState<FieldCfg[]>(initial.config.fields)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [autoValues, setAutoValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const map: Record<string, string> = {}
    initial.fields.forEach((f) => { if (f.valueSource === "auto") map[f.fieldKey] = f.value })
    setAutoValues(map)
  }, [initial])

  const save = trpc.slate.saveConfig.useMutation({
    onSuccess: (data) => {
      setDirty(false)
      const map: Record<string, string> = {}
      data.fields.forEach((f) => { if (f.valueSource === "auto") map[f.fieldKey] = f.value })
      setAutoValues(map)
    },
    onError: (e) => setError(parseApiError(e)),
  })
  const requestExport = trpc.exports.request.useMutation({
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError: (e) => setError(parseApiError(e)),
  })

  const patch = (i: number, data: Partial<FieldCfg>) => {
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...data } : x)))
    setDirty(true)
  }

  // Live preview values follow the local (unsaved) config
  const preview = fields
    .filter((f) => f.enabled !== false)
    .map((f) => ({
      ...f,
      value: f.valueSource === "manual" ? (f.manualValue ?? "") : (autoValues[f.fieldKey] ?? "—"),
    }))
  const big = preview.filter((f) => BIG_KEYS.includes(f.fieldKey))
  const rest = preview.filter((f) => !BIG_KEYS.includes(f.fieldKey))

  return (
    <div>
      <Link href={`/projects/${projectId}/shotlist`} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-text">
        <ArrowLeft size={12} /> Shotlist
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">
          Slate — <span className="font-mono text-smpte-cyan">{initial.shotNumber}</span>
        </h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({ projectId, shotId, config: { enabled: true, layout: initial.config.layout, fields } })}
          >
            <span className="flex items-center gap-1.5"><Save size={12} /> {save.isPending ? "Saving…" : dirty ? "Save config" : "Saved"}</span>
          </Button>
          <Button
            variant="ghost"
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "SLATE_PDF", entityId: shotId, format: "pdf" })}
          >
            <span className="flex items-center gap-1.5"><Download size={12} /> PDF</span>
          </Button>
          <Button
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "SLATE_PNG", entityId: shotId, format: "png" })}
          >
            <span className="flex items-center gap-1.5"><Download size={12} /> {requestExport.isPending ? "Rendering…" : "PNG overlay"}</span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Config table */}
        <div className="xl:col-span-2">
          <SectionLabel label="Fields" color={SMPTE.green} />
          <div className="space-y-1.5">
            {fields.map((f, i) => (
              <div key={f.fieldKey + i} className="flex items-center gap-2 rounded-[3px] border border-border-dim bg-surface-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={f.enabled !== false}
                  onChange={(e) => patch(i, { enabled: e.target.checked })}
                  title="Show on slate"
                />
                <input
                  className="font-mono w-24 rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 text-[10px] uppercase tracking-wider text-muted hover:border-border focus:border-smpte-cyan/60 focus:outline-none"
                  value={f.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                />
                <select
                  className="cursor-pointer rounded-[2px] border border-border-dim bg-transparent px-1 py-0.5 text-[10px] text-muted focus:outline-none"
                  value={f.valueSource}
                  onChange={(e) => patch(i, { valueSource: e.target.value as "auto" | "manual" })}
                >
                  <option value="auto">auto</option>
                  <option value="manual">manual</option>
                </select>
                {f.valueSource === "manual" ? (
                  <input
                    className="font-mono min-w-0 flex-1 rounded-[2px] border border-border bg-bg-deep px-2 py-0.5 text-[11px] focus:border-smpte-cyan/60 focus:outline-none"
                    value={f.manualValue ?? ""}
                    placeholder="value…"
                    onChange={(e) => patch(i, { manualValue: e.target.value })}
                  />
                ) : (
                  <span className="font-mono min-w-0 flex-1 truncate text-right text-[11px] text-text/80">
                    {autoValues[f.fieldKey] ?? "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-faint">
            Auto fields update from the shot, project and schedule. PNG renders at 1920×1080 for post-production overlay.
          </p>
        </div>

        {/* Live preview */}
        <div className="xl:col-span-3">
          <SectionLabel label="Preview" color={SMPTE.cyan} />
          <div className="overflow-hidden rounded-md border border-border" style={{ background: "#0A0A0A" }}>
            <div className="flex" style={{ height: 8 }}>
              {SMPTE_LIST.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
            </div>
            <div className="p-7">
              <div className="mb-6 flex gap-3">
                {big.map((f) => (
                  <div key={f.fieldKey} className="flex-1 rounded-md border-2 border-[#3A3A3A] px-4 py-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#8A8A8A]">{f.label}</div>
                    <div className="font-mono mt-1 text-4xl font-bold text-text">{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                {rest.map((f) => (
                  <div key={f.fieldKey} className="flex items-baseline justify-between border-b border-[#222] pb-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A8A8A]">{f.label}</span>
                    <span className="font-mono text-sm font-bold text-text">{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <MonoChip color="#4A4A4A">FRAME</MonoChip>
                <MonoChip color="#4A4A4A">PRODUCTION SLATE</MonoChip>
              </div>
            </div>
            <div className="flex" style={{ height: 8 }}>
              {SMPTE_LIST.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
