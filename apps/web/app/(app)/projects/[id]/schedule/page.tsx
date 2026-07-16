"use client"

import { use, useState } from "react"
import Link from "next/link"
import { Plus, Calendar, MapPin, Download } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Button, Card, EmptyState, ErrorNote, Field, Input, Modal, MonoChip, Spinner, StatusBadge,
} from "@/components/ui"
import { DAY_STATUS, SMPTE } from "@/lib/theme"

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const days = trpc.productionDay.list.useQuery({ projectId })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ date: "", generalCallTime: "06:00" })

  const create = trpc.productionDay.create.useMutation({
    onSuccess: () => {
      utils.productionDay.list.invalidate({ projectId })
      setOpen(false)
      setError(null)
    },
    onError: (e) => setError(parseApiError(e)),
  })
  const requestExport = trpc.exports.request.useMutation({
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError: (e) => setError(parseApiError(e)),
  })

  if (days.isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Production Days</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "PRODUCTION_SCHEDULE", format: "pdf" })}
          >
            <span className="flex items-center gap-1.5">
              <Download size={12} /> {requestExport.isPending ? "Generating…" : "Schedule PDF"}
            </span>
          </Button>
          <Button onClick={() => setOpen(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Day</span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      {!days.data?.length ? (
        <EmptyState title="No production days" hint="Plan each shoot day: call times, schedule, call sheet." />
      ) : (
        <div className="space-y-3">
          {days.data.map((d, i) => (
            <Link key={d.id} href={`/projects/${projectId}/schedule/${d.id}`} className="block">
              <Card className="flex flex-wrap items-center gap-4 transition-colors hover:border-muted">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[3px] border border-border bg-surface-2">
                  <span className="font-mono text-[9px] uppercase text-muted">Day</span>
                  <span className="font-display text-sm font-bold" style={{ color: SMPTE.blue }}>{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display flex items-center gap-2 text-sm font-semibold">
                    <Calendar size={13} className="text-muted" />
                    {new Date(d.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <MapPin size={11} />
                    {d.locations.map((l) => l.location.name).join(" · ") || "No locations"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <MonoChip color={SMPTE.yellow}>CALL {d.generalCallTime}</MonoChip>
                  <span className="font-mono text-[10px] text-muted">{d._count.scheduleBlocks} blocks</span>
                  <StatusBadge status={DAY_STATUS[d.status]} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal title="New production day" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ projectId, date: form.date, generalCallTime: form.generalCallTime })
          }}
        >
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required autoFocus />
          </Field>
          <Field label="General call time">
            <Input type="time" value={form.generalCallTime} onChange={(e) => setForm({ ...form, generalCallTime: e.target.value })} required />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={create.isPending} className="w-full">Create day</Button>
        </form>
      </Modal>
    </div>
  )
}
