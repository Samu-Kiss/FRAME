"use client"

import { use, useState } from "react"
import { Plus, Trash2, Download } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner } from "@/components/ui"
import { SMPTE, enumLabel } from "@/lib/theme"

type BudgetData = RouterOutputs["budget"]["list"]
type Item = BudgetData["items"][number]

const CATEGORIES = [
  "CAST", "CREW", "LOCATIONS", "EQUIPMENT", "ART_PROPS", "WARDROBE_MAKEUP",
  "TRANSPORT", "CATERING", "POST", "INSURANCE", "CONTINGENCY", "OTHER",
]

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export default function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const budget = trpc.budget.list.useQuery({ projectId })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => utils.budget.list.invalidate({ projectId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const update = trpc.budget.update.useMutation({ onSuccess: invalidate, onError })
  const remove = trpc.budget.delete.useMutation({ onSuccess: invalidate, onError })

  if (budget.isLoading || !budget.data) return <Spinner />
  const d = budget.data
  const variance = d.actualTotal - d.estimatedTotal
  const categoriesWithItems = CATEGORIES.filter((c) => d.byCategory[c])

  function exportCsv() {
    const rows = [["Category", "Item", "Qty", "Unit", "Est. Unit", "Est. Total", "Actual Unit", "Actual Total", "Notes"]]
    for (const it of d.items) {
      rows.push([
        enumLabel(it.category), it.label, String(it.quantity), it.unit ?? "",
        String(it.estimated), String(it.estimated * it.quantity),
        it.actual != null ? String(it.actual) : "", it.actual != null ? String(it.actual * it.quantity) : "",
        it.notes ?? "",
      ])
    }
    rows.push([])
    rows.push(["", "", "", "", "", String(d.estimatedTotal), "", String(d.actualTotal), ""])
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "budget.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Budget</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportCsv} disabled={!d.items.length}>
            <span className="flex items-center gap-1.5"><Download size={12} /> CSV</span>
          </Button>
          <Button onClick={() => setOpen(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Line item</span>
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Estimated</p>
          <p className="font-display mt-2 text-2xl font-bold" style={{ color: SMPTE.blue }}>{money(d.estimatedTotal)}</p>
        </Card>
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Actual</p>
          <p className="font-display mt-2 text-2xl font-bold" style={{ color: SMPTE.green }}>{money(d.actualTotal)}</p>
        </Card>
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Variance</p>
          <p className="font-display mt-2 text-2xl font-bold" style={{ color: variance > 0 ? SMPTE.red : SMPTE.green }}>
            {variance > 0 ? "+" : ""}{money(variance)}
          </p>
        </Card>
      </div>

      <ErrorNote message={error} />

      {!d.items.length ? (
        <EmptyState title="No budget items" hint="Add line items grouped by category to track estimated vs actual cost." />
      ) : (
        <div className="space-y-5">
          {categoriesWithItems.map((cat) => {
            const catItems = d.items.filter((it) => it.category === cat)
            const roll = d.byCategory[cat]!
            return (
              <div key={cat} className="overflow-hidden rounded-md border border-border-dim bg-surface-2">
                <div className="flex items-center justify-between border-b border-border-dim px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: SMPTE.green }}>
                    {enumLabel(cat)} · {roll.count}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    est {money(roll.estimated)} · act {money(roll.actual)}
                  </span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-dim text-left">
                      {["Item", "Qty", "Unit", "Est. / unit", "Est. total", "Actual / unit", "Actual total", ""].map((h, i) => (
                        <th key={i} className="font-mono px-3 py-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((it) => (
                      <BudgetRow
                        key={it.id}
                        item={it}
                        onUpdate={(data) => update.mutate({ projectId, itemId: it.id, data })}
                        onDelete={() => remove.mutate({ projectId, itemId: it.id })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      <NewItemModal projectId={projectId} open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

const cell = "cursor-text rounded-[2px] border border-transparent bg-transparent px-1.5 py-1 text-xs text-text hover:border-border focus:border-smpte-cyan/60 focus:outline-none"

function BudgetRow({
  item, onUpdate, onDelete,
}: {
  item: Item
  onUpdate: (data: Record<string, unknown>) => void
  onDelete: () => void
}) {
  const numOnBlur = (field: string, current: number | null) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim()
    const v = raw === "" ? null : Number(raw)
    if (v !== current && !(v === null && current === null)) onUpdate({ [field]: v })
  }
  return (
    <tr className="group border-b border-border-dim/60 hover:bg-surface">
      <td className="px-3 py-1.5">
        <input className={`${cell} w-44`} defaultValue={item.label} onBlur={(e) => { if (e.target.value !== item.label) onUpdate({ label: e.target.value }) }} />
      </td>
      <td className="px-3 py-1.5">
        <input type="number" className={`font-mono ${cell} w-14`} defaultValue={item.quantity} onBlur={numOnBlur("quantity", item.quantity)} />
      </td>
      <td className="px-3 py-1.5">
        <input className={`${cell} w-16`} defaultValue={item.unit ?? ""} placeholder="—" onBlur={(e) => { const v = e.target.value || null; if (v !== item.unit) onUpdate({ unit: v }) }} />
      </td>
      <td className="px-3 py-1.5">
        <input type="number" className={`font-mono ${cell} w-20`} defaultValue={item.estimated} onBlur={numOnBlur("estimated", item.estimated)} />
      </td>
      <td className="font-mono px-3 py-1.5 text-muted">{money(item.estimated * item.quantity)}</td>
      <td className="px-3 py-1.5">
        <input type="number" className={`font-mono ${cell} w-20`} defaultValue={item.actual ?? ""} placeholder="—" onBlur={numOnBlur("actual", item.actual)} />
      </td>
      <td className="font-mono px-3 py-1.5" style={{ color: item.actual != null ? SMPTE.green : "#3A3A3A" }}>
        {item.actual != null ? money(item.actual * item.quantity) : "—"}
      </td>
      <td className="px-3 py-1.5">
        <button className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100" onClick={onDelete}>
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  )
}

function NewItemModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ category: "CREW", label: "", estimated: "", quantity: "1", unit: "" })

  const create = trpc.budget.create.useMutation({
    onSuccess: () => {
      utils.budget.list.invalidate({ projectId })
      setForm({ category: "CREW", label: "", estimated: "", quantity: "1", unit: "" })
      setError(null)
      onClose()
    },
    onError: (e) => setError(parseApiError(e)),
  })

  return (
    <Modal title="New budget line" open={open} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({
            projectId,
            category: form.category as never,
            label: form.label,
            estimated: Number(form.estimated) || 0,
            quantity: Number(form.quantity) || 1,
            unit: form.unit || null,
          })
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{enumLabel(c)}</option>)}
            </Select>
          </Field>
          <Field label="Unit (optional)">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="day, flat, unit…" />
          </Field>
        </div>
        <Field label="Item">
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required autoFocus placeholder="e.g. DP day rate" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estimated / unit ($)">
            <Input type="number" min={0} step="0.01" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} required />
          </Field>
          <Field label="Quantity">
            <Input type="number" min={0} step="0.5" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
        </div>
        <ErrorNote message={error} />
        <Button type="submit" disabled={create.isPending} className="w-full">Add line item</Button>
      </form>
    </Modal>
  )
}
