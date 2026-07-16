"use client"

import { use, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Button, EmptyState, ErrorNote, Field, Input, Modal, MonoChip, Select, Spinner,
} from "@/components/ui"
import { PROP_STATUS, SMPTE, enumLabel } from "@/lib/theme"

const CATEGORIES = ["PROP", "SET_DRESSING", "VEHICLE", "FOOD", "WEAPON", "DOCUMENT", "TECH", "OTHER"]
const STATUSES = Object.keys(PROP_STATUS)
const SOURCES = ["OWN", "RENTED", "PURCHASED", "BORROWED"]

export default function PropsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const props = trpc.props.list.useQuery({ projectId })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fStatus, setFStatus] = useState("")
  const [form, setForm] = useState({ name: "", category: "PROP", quantity: "1", source: "", sourceName: "", cost: "" })

  const invalidate = () => utils.props.list.invalidate({ projectId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const create = trpc.props.create.useMutation({
    onSuccess: () => { invalidate(); setOpen(false); setError(null); setForm({ name: "", category: "PROP", quantity: "1", source: "", sourceName: "", cost: "" }) },
    onError,
  })
  const update = trpc.props.update.useMutation({ onSuccess: invalidate, onError })
  const remove = trpc.props.delete.useMutation({ onSuccess: invalidate, onError })

  if (props.isLoading) return <Spinner />
  const rows = (props.data ?? []).filter((p) => !fStatus || p.status === fStatus)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Props</h1>
        <div className="flex items-center gap-2">
          <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="!w-40">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{PROP_STATUS[s]!.label}</option>)}
          </Select>
          <Button onClick={() => setOpen(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Prop</span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      {!rows.length ? (
        <EmptyState title="No props" hint="Track every prop from searching to returned." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-dim bg-surface-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-dim text-left">
                {["Prop", "Category", "Qty", "Status", "Source", "Cost", "Scenes", ""].map((h, i) => (
                  <th key={i} className="font-mono px-4 py-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="group border-b border-border-dim/60 hover:bg-surface">
                  <td className="px-4 py-2.5 font-medium">
                    {p.name}
                    {p._count.tasks > 0 ? <span className="font-mono ml-2 text-[9px] text-smpte-red">{p._count.tasks} task{p._count.tasks === 1 ? "" : "s"}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{enumLabel(p.category)}</td>
                  <td className="font-mono px-4 py-2.5">{p.quantity}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="cursor-pointer rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 text-[11px] hover:border-border focus:outline-none"
                      value={p.status}
                      style={{ color: PROP_STATUS[p.status]?.color }}
                      onChange={(e) => update.mutate({ projectId, propId: p.id, data: { status: e.target.value as never } })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{PROP_STATUS[s]!.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {p.source ? `${enumLabel(p.source)}${p.sourceName ? ` — ${p.sourceName}` : ""}` : "—"}
                  </td>
                  <td className="font-mono px-4 py-2.5 text-muted">{p.cost != null ? `$${p.cost}` : "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {p.sceneProps.map((sp) => <MonoChip key={sp.scene.id} color={SMPTE.white}>SC {sp.scene.number}</MonoChip>)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                      onClick={() => { if (confirm(`Delete prop "${p.name}"?`)) remove.mutate({ projectId, propId: p.id }) }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="New prop" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              projectId,
              name: form.name,
              category: form.category as never,
              quantity: Number(form.quantity) || 1,
              source: (form.source || null) as never,
              sourceName: form.sourceName || null,
              cost: form.cost ? Number(form.cost) : null,
            })
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{enumLabel(c)}</option>)}
              </Select>
            </Field>
            <Field label="Quantity">
              <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="">—</option>
                {SOURCES.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}
              </Select>
            </Field>
            <Field label="Source name">
              <Input value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
            </Field>
          </div>
          <Field label="Cost (optional)">
            <Input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={create.isPending} className="w-full">Add prop</Button>
        </form>
      </Modal>
    </div>
  )
}
