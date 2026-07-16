"use client"

import { use, useState } from "react"
import { Plus, Trash2, Layers } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Avatar, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, MonoChip, SectionLabel, Select, Spinner, Textarea,
} from "@/components/ui"
import { SMPTE, enumLabel } from "@/lib/theme"
import { toRichText, fromRichText } from "@/lib/richtext"

type StylingItemRow = RouterOutputs["stylings"]["list"][number]["garments"][number]

const ITEM_STATUS: Record<string, string> = {
  SEARCHING: SMPTE.yellow,
  CONFIRMED: SMPTE.green,
  ON_LOAN: SMPTE.cyan,
  PURCHASED: SMPTE.white,
}
const ITEM_STATUSES = Object.keys(ITEM_STATUS)

export default function StylingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const stylings = trpc.stylings.list.useQuery({ projectId })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => utils.stylings.list.invalidate({ projectId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const remove = trpc.stylings.delete.useMutation({ onSuccess: invalidate, onError })

  if (stylings.isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Styling &amp; Looks</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-1.5"><Plus size={12} /> Look</span>
        </Button>
      </div>

      <ErrorNote message={error} />

      {!stylings.data?.length ? (
        <EmptyState title="No looks yet" hint="A look is specific to one character across one or more scenes (§4.8)." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {stylings.data.map((s) => (
            <Card key={s.id} className="group">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Layers size={14} style={{ color: SMPTE.magenta }} />
                  <div>
                    <h2 className="font-display text-sm font-bold">{s.lookName}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                      <Avatar name={s.character.name} size={14} />
                      {s.character.name}
                      {s.character.talent?.characterName ? ` as "${s.character.talent.characterName}"` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.scenes.map((sc) => (
                    <MonoChip key={sc.id} color={SMPTE.white}>SC {sc.number}</MonoChip>
                  ))}
                  <button
                    className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                    onClick={() => { if (confirm(`Delete look "${s.lookName}"?`)) remove.mutate({ projectId, stylingId: s.id }) }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {fromRichText(s.description) ? (
                <p className="mb-3 text-[11px] leading-relaxed text-muted">{fromRichText(s.description)}</p>
              ) : null}

              <ItemList projectId={projectId} styling={s} kind="garment" items={s.garments} onError={onError} />
              <ItemList projectId={projectId} styling={s} kind="accessory" items={s.accessories} onError={onError} />
            </Card>
          ))}
        </div>
      )}

      <NewLookModal projectId={projectId} open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

/* ── Garment / accessory list with inline status + add form ───── */

function ItemList({
  projectId, styling, kind, items, onError,
}: {
  projectId: string
  styling: { id: string }
  kind: "garment" | "accessory"
  items: StylingItemRow[]
  onError: (e: unknown) => void
}) {
  const utils = trpc.useUtils()
  const invalidate = () => utils.stylings.list.invalidate({ projectId })
  const addItem = trpc.stylings.addItem.useMutation({ onSuccess: invalidate, onError })
  const updateItem = trpc.stylings.updateItem.useMutation({ onSuccess: invalidate, onError })
  const deleteItem = trpc.stylings.deleteItem.useMutation({ onSuccess: invalidate, onError })
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ item: "", brand: "", color: "" })

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <SectionLabel label={kind === "garment" ? `Garments · ${items.length}` : `Accessories · ${items.length}`} color={SMPTE.magenta} />
        <button
          className="font-mono cursor-pointer text-[10px] uppercase tracking-wider text-faint hover:text-text"
          onClick={() => setAdding(!adding)}
        >
          + add
        </button>
      </div>
      {items.length === 0 && !adding ? (
        <p className="py-1 text-[10px] text-faint">None yet.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((g) => (
            <li key={g.id} className="group/item flex items-center gap-2 rounded-[3px] border border-border-dim bg-surface-2 px-2.5 py-1.5 text-[11px]">
              <span className="min-w-0 flex-1 truncate">
                {g.item}
                <span className="text-muted"> · {g.color}{g.brand ? ` · ${g.brand}` : ""}{g.size ? ` · ${g.size}` : ""}</span>
              </span>
              <select
                className="cursor-pointer rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 text-[10px] hover:border-border focus:outline-none"
                value={g.status}
                style={{ color: ITEM_STATUS[g.status] }}
                onChange={(e) => updateItem.mutate({ projectId, itemId: g.id, kind, data: { status: e.target.value as never } })}
              >
                {ITEM_STATUSES.map((st) => <option key={st} value={st}>{enumLabel(st)}</option>)}
              </select>
              <button
                className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover/item:opacity-100"
                onClick={() => deleteItem.mutate({ projectId, itemId: g.id, kind })}
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form
          className="mt-1.5 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            addItem.mutate({ projectId, stylingId: styling.id, kind, item: form.item, color: form.color, brand: form.brand || null })
            setForm({ item: "", brand: "", color: "" })
            setAdding(false)
          }}
        >
          <Input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} required autoFocus placeholder={kind === "garment" ? "Item — e.g. Silk slip dress" : "Item — e.g. Gold chain"} className="!py-1 text-[11px]" />
          <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} required placeholder="Color" className="!w-24 !py-1 text-[11px]" />
          <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="!w-24 !py-1 text-[11px]" />
          <Button type="submit" className="!px-3 !py-1">Add</Button>
        </form>
      ) : null}
    </div>
  )
}

/* ── New look modal ───────────────────────────────────────────── */

function NewLookModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils()
  const persons = trpc.persons.list.useQuery({ projectId }, { enabled: open })
  const tree = trpc.structure.tree.useQuery({ projectId }, { enabled: open })
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ lookName: "", characterId: "", description: "" })
  const [sceneIds, setSceneIds] = useState<string[]>([])

  const talents = (persons.data ?? []).filter((p) => p.type === "TALENT")
  const scenes = (tree.data ?? []).flatMap((a) => a.scenes)

  const create = trpc.stylings.create.useMutation({
    onSuccess: () => {
      utils.stylings.list.invalidate({ projectId })
      setForm({ lookName: "", characterId: "", description: "" })
      setSceneIds([])
      setError(null)
      onClose()
    },
    onError: (e) => setError(parseApiError(e)),
  })

  return (
    <Modal title="New look" open={open} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({
            projectId,
            characterId: form.characterId,
            lookName: form.lookName,
            description: form.description ? toRichText(form.description) : undefined,
            sceneIds,
          })
        }}
      >
        <Field label='Look name (e.g. "Look 1 — Rooftop Night")'>
          <Input value={form.lookName} onChange={(e) => setForm({ ...form, lookName: e.target.value })} required autoFocus />
        </Field>
        <Field label="Character (talent)">
          <Select value={form.characterId} onChange={(e) => setForm({ ...form, characterId: e.target.value })} required>
            <option value="">Select talent…</option>
            {talents.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.talent?.characterName ? ` — "${t.talent.characterName}"` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Scenes (${sceneIds.length} selected)`}>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-[3px] border border-border bg-surface-2 p-2.5">
            {scenes.map((sc) => (
              <label key={sc.id} className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-text">
                <input
                  type="checkbox"
                  checked={sceneIds.includes(sc.id)}
                  onChange={(e) =>
                    setSceneIds(e.target.checked ? [...sceneIds, sc.id] : sceneIds.filter((id) => id !== sc.id))
                  }
                />
                <MonoChip color={SMPTE.white}>SC {sc.number}</MonoChip>
                {sc.title}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Description (optional)">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" disabled={create.isPending} className="w-full">Create look</Button>
      </form>
    </Modal>
  )
}
