"use client"

import { use, useState } from "react"
import { Plus, Trash2, Camera } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Button, Card, EmptyState, ErrorNote, Field, Input, Modal, MonoChip, Select, Spinner, Avatar,
} from "@/components/ui"
import { SMPTE, enumLabel } from "@/lib/theme"

const TYPES = ["CAMERA", "LENS", "STEADICAM", "SLIDER", "DRONE", "LIGHTING", "SOUND", "GRIP", "OTHER"]

export default function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const equipment = trpc.equipment.list.useQuery({ projectId })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", type: "CAMERA", brand: "", model: "", rentalSource: "", notes: "" })

  const invalidate = () => utils.equipment.list.invalidate({ projectId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const create = trpc.equipment.create.useMutation({
    onSuccess: () => { invalidate(); setOpen(false); setError(null); setForm({ name: "", type: "CAMERA", brand: "", model: "", rentalSource: "", notes: "" }) },
    onError,
  })
  const remove = trpc.equipment.delete.useMutation({ onSuccess: invalidate, onError })

  if (equipment.isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Equipment</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1.5"><Plus size={12} /> Equipment</span>
        </Button>
      </div>

      <ErrorNote message={error} />

      {!equipment.data?.length ? (
        <EmptyState title="No equipment" hint="Cameras, lenses, grip — tracked by type and assignment." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {equipment.data.map((e) => (
            <Card key={e.id} className="group !p-4">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera size={13} style={{ color: SMPTE.cyan }} />
                  <p className="font-display text-xs font-semibold">{e.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MonoChip>{enumLabel(e.type)}</MonoChip>
                  <button
                    className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                    onClick={() => { if (confirm(`Delete "${e.name}"?`)) remove.mutate({ projectId, equipmentId: e.id }) }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="mb-2 text-[11px] text-muted">
                {[e.brand, e.model].filter(Boolean).join(" ") || "—"}
                {e.rentalSource ? ` · ${e.rentalSource}` : ""}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {e.assignedTo.map((a) => (
                    <Avatar key={a.crewId} name={a.crew.person.name} />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-faint">{e._count.shotEquipment} shot{e._count.shotEquipment === 1 ? "" : "s"}</span>
              </div>
              {e.notes ? <p className="mt-2 text-[10px] text-faint">{e.notes}</p> : null}
            </Card>
          ))}
        </div>
      )}

      <Modal title="New equipment" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              projectId,
              name: form.name,
              type: form.type as never,
              brand: form.brand || null,
              model: form.model || null,
              rentalSource: form.rentalSource || null,
              notes: form.notes || null,
            })
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand">
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Model">
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </Field>
          </div>
          <Field label="Rental source">
            <Input value={form.rentalSource} onChange={(e) => setForm({ ...form, rentalSource: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={create.isPending} className="w-full">Add equipment</Button>
        </form>
      </Modal>
    </div>
  )
}
