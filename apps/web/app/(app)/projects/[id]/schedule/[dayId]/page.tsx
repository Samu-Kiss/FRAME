"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Button, Card, ErrorNote, Field, Input, Modal, MonoChip, SectionLabel, Select, Spinner, StatusBadge, Avatar,
} from "@/components/ui"
import { BLOCK_STYLE, DAY_STATUS, SMPTE, enumLabel, toMins } from "@/lib/theme"
import { fromRichText } from "@/lib/richtext"

const BLOCK_TYPES = ["SETUP", "SHOOTING", "CATERING", "BREAK", "WARDROBE_CHANGE", "TRAVEL", "PICKUP", "WRAP", "OTHER"]
const DAY_STATUSES = Object.keys(DAY_STATUS)

type DayData = NonNullable<ReturnType<typeof useDay>["data"]>
type Block = DayData["scheduleBlocks"][number]

function useDay(projectId: string, dayId: string) {
  return trpc.productionDay.get.useQuery({ projectId, productionDayId: dayId })
}

export default function ProductionDayPage({ params }: { params: Promise<{ id: string; dayId: string }> }) {
  const { id: projectId, dayId } = use(params)
  const utils = trpc.useUtils()
  const day = useDay(projectId, dayId)
  const [error, setError] = useState<string | null>(null)
  const [blockModal, setBlockModal] = useState(false)

  const invalidate = () => utils.productionDay.get.invalidate({ projectId, productionDayId: dayId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const updateDay = trpc.productionDay.update.useMutation({ onSuccess: invalidate, onError })
  const deleteBlock = trpc.productionDay.deleteBlock.useMutation({ onSuccess: invalidate, onError })
  const requestExport = trpc.exports.request.useMutation({
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError,
  })

  // Group parallel blocks — they render as side-by-side columns (§4.13)
  const grouped = useMemo(() => {
    const list = day.data?.scheduleBlocks ?? []
    const groups: Block[][] = []
    for (const block of list) {
      if (block.parallel && block.parallelGroupId) {
        const g = groups.find((grp) => grp[0]?.parallel && grp[0]?.parallelGroupId === block.parallelGroupId)
        if (g) { g.push(block); continue }
      }
      groups.push([block])
    }
    return groups
  }, [day.data])

  if (day.isLoading || !day.data) return <Spinner />
  const d = day.data

  return (
    <div>
      <Link href={`/projects/${projectId}/schedule`} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-text">
        <ArrowLeft size={12} /> Production days
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold uppercase tracking-[0.12em]">
            {new Date(d.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <MonoChip color={SMPTE.yellow}>GENERAL CALL {d.generalCallTime}</MonoChip>
            <select
              className="cursor-pointer rounded-[2px] border border-border bg-transparent px-1.5 py-1 text-[10px] focus:outline-none"
              value={d.status}
              style={{ color: DAY_STATUS[d.status]?.color }}
              onChange={(e) => updateDay.mutate({ projectId, productionDayId: dayId, data: { status: e.target.value as never } })}
            >
              {DAY_STATUSES.map((s) => <option key={s} value={s}>{DAY_STATUS[s]!.label}</option>)}
            </select>
            <span className="text-[11px] text-muted">{d.locations.map((l) => l.location.name).join(" · ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setBlockModal(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Block</span>
          </Button>
          <Button
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "CALL_SHEET", entityId: dayId, format: "pdf" })}
          >
            <span className="flex items-center gap-1.5">
              <Download size={12} /> {requestExport.isPending ? "Generating…" : "Call Sheet PDF"}
            </span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Timeline */}
        <div className="xl:col-span-2">
          <SectionLabel label="Day timeline" color={SMPTE.blue} />
          {grouped.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-10 text-center text-xs text-faint">
              No schedule blocks yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {grouped.map((group, gi) => {
                const first = group[0]!
                const dur = toMins(first.endTime) - toMins(first.startTime)
                return (
                  <div key={gi} className="flex gap-3">
                    <div className="font-mono w-20 shrink-0 pt-2 text-right text-[10px] leading-tight text-muted">
                      {first.startTime}
                      <br />
                      <span className="text-faint">{first.endTime}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 gap-1.5">
                      {group.map((block) => {
                        const style = BLOCK_STYLE[block.type] ?? BLOCK_STYLE.OTHER!
                        return (
                          <div
                            key={block.id}
                            className="group min-w-0 flex-1 rounded-[3px] border px-3 py-2"
                            style={{
                              background: style.bg,
                              borderColor: style.border,
                              minHeight: Math.max(44, dur * 0.55),
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium" style={{ color: style.text }}>
                                {block.label}
                              </p>
                              <button
                                className="shrink-0 cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                                onClick={() => deleteBlock.mutate({ projectId, blockId: block.id })}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {enumLabel(block.type)}
                              {block.location ? ` · ${block.location.name}` : ""}
                            </p>
                            {block.shots.length ? (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {block.shots.map((s) => (
                                  <MonoChip key={s.shot.id} color={SMPTE.cyan}>{s.shot.shotNumber}</MonoChip>
                                ))}
                              </div>
                            ) : null}
                            {block.notes ? <p className="mt-1 text-[10px] text-faint">{block.notes}</p> : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Calls */}
        <div className="space-y-6">
          <div>
            <SectionLabel label="Crew calls" color={SMPTE.cyan} />
            <Card className="!p-0">
              {d.crewCalls.length === 0 ? (
                <p className="py-5 text-center text-[11px] text-faint">No crew calls.</p>
              ) : (
                <ul className="divide-y divide-border-dim">
                  {d.crewCalls.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span>{c.person ? `${c.person.name} — ${c.person.role}` : enumLabel(c.department ?? "")}</span>
                      <MonoChip color={SMPTE.yellow}>{c.callTime}</MonoChip>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div>
            <SectionLabel label="Talent" color={SMPTE.yellow} />
            <Card className="!p-0">
              {d.talentCalls.length === 0 ? (
                <p className="py-5 text-center text-[11px] text-faint">No talent calls.</p>
              ) : (
                <ul className="divide-y divide-border-dim">
                  {d.talentCalls.map((c) => (
                    <li key={c.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.person.name} />
                        <span className="flex-1 text-xs">{c.person.name}</span>
                        <MonoChip color={SMPTE.yellow}>{c.callTime}</MonoChip>
                      </div>
                      <p className="font-mono mt-1.5 pl-7 text-[9px] uppercase tracking-wide text-muted">
                        HMU {c.makeupCallTime ?? "—"} · Set {c.onSetTime ?? "—"} · Wrap {c.wrapTime ?? "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          {fromRichText(d.generalNotes) ? (
            <div>
              <SectionLabel label="Notes" color={SMPTE.white} />
              <Card>
                <p className="text-[11px] leading-relaxed text-muted">{fromRichText(d.generalNotes)}</p>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      <NewBlockModal
        projectId={projectId}
        dayId={dayId}
        open={blockModal}
        close={() => setBlockModal(false)}
        onDone={invalidate}
      />
    </div>
  )
}

function NewBlockModal({
  projectId, dayId, open, close, onDone,
}: {
  projectId: string
  dayId: string
  open: boolean
  close: () => void
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    startTime: "08:00", endTime: "09:00", type: "SHOOTING", label: "", parallel: false, parallelGroupId: "",
  })
  const create = trpc.productionDay.createBlock.useMutation({
    onSuccess: () => { onDone(); close(); setError(null) },
    onError: (e) => setError(parseApiError(e)),
  })

  return (
    <Modal title="New schedule block" open={open} onClose={close}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({
            projectId,
            productionDayId: dayId,
            startTime: form.startTime,
            endTime: form.endTime,
            type: form.type as never,
            label: form.label,
            parallel: form.parallel,
            parallelGroupId: form.parallel ? form.parallelGroupId || `grp-${form.startTime}` : null,
          })
        }}
      >
        <Field label="Label">
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required autoFocus placeholder="e.g. Shooting — Scene 1A" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Start">
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          </Field>
          <Field label="End">
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {BLOCK_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={form.parallel} onChange={(e) => setForm({ ...form, parallel: e.target.checked })} />
          Runs in parallel with other blocks at the same time
        </label>
        {form.parallel ? (
          <Field label="Parallel group id (blocks sharing it render side by side)">
            <Input
              value={form.parallelGroupId}
              onChange={(e) => setForm({ ...form, parallelGroupId: e.target.value })}
              placeholder={`grp-${form.startTime}`}
            />
          </Field>
        ) : null}
        <ErrorNote message={error} />
        <Button type="submit" disabled={create.isPending} className="w-full">Add block</Button>
      </form>
    </Modal>
  )
}
