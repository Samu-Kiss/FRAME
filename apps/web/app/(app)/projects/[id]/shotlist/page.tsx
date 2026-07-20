"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import {
  Plus, Table2, LayoutGrid, ChevronDown, ChevronRight, Trash2, Download, Bookmark, Clapperboard,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Button, EmptyState, ErrorNote, Field, Input, Modal, MonoChip, Select, Spinner,
  StatusBadge, Avatar, Textarea, SectionLabel,
} from "@/components/ui"
import { CommentThread } from "@/components/comments"
import { SHOT_STATUS, SMPTE, enumLabel } from "@/lib/theme"
import { toRichText, fromRichText } from "@/lib/richtext"

const FRAME_SIZES = ["ECU", "CU", "MCU", "MS", "MLS", "LS", "ELS", "AERIAL", "POV", "OTS", "TWO_SHOT", "INSERT", "OTHER"]
const STATUSES = Object.keys(SHOT_STATUS)
const DAYLIGHTS = ["DAWN", "MORNING", "MIDDAY", "AFTERNOON", "SUNSET", "NIGHT", "DEEP_NIGHT", "STUDIO"]

type Tree = NonNullable<ReturnType<typeof useTree>["data"]>
type Scene = Tree[number]["scenes"][number]
type Shot = Scene["shots"][number]

function useTree(projectId: string) {
  return trpc.structure.tree.useQuery({ projectId })
}

export default function ShotlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const tree = useTree(projectId)
  const invalidate = () => utils.structure.tree.invalidate({ projectId })

  const [view, setView] = useState<"table" | "cards">("table")
  const [fAct, setFAct] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fLocation, setFLocation] = useState("")
  const [fPerson, setFPerson] = useState("")
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<
    | { kind: "act" }
    | { kind: "scene"; actId: string }
    | { kind: "shot"; scene: Scene }
    | null
  >(null)

  const onError = (e: unknown) => setError(parseApiError(e))
  const updateShot = trpc.structure.updateShot.useMutation({ onSuccess: invalidate, onError })
  const deleteShot = trpc.structure.deleteShot.useMutation({ onSuccess: invalidate, onError })
  const requestExport = trpc.exports.request.useMutation({
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError,
  })
  const nameVersion = trpc.changelog.nameVersion.useMutation({
    onSuccess: () => setError(null),
    onError,
  })

  const locations = useMemo(() => {
    const map = new Map<string, string>()
    tree.data?.forEach((a) => a.scenes.forEach((s) => s.location && map.set(s.location.id, s.location.name)))
    return [...map.entries()]
  }, [tree.data])

  const people = useMemo(() => {
    const map = new Map<string, string>()
    tree.data?.forEach((a) =>
      a.scenes.forEach((s) => s.shots.forEach((sh) => sh.people.forEach((p) => map.set(p.person.id, p.person.name))))
    )
    return [...map.entries()]
  }, [tree.data])

  const filtered = useMemo(() => {
    if (!tree.data) return []
    return tree.data
      .filter((a) => !fAct || a.id === fAct)
      .map((a) => ({
        ...a,
        scenes: a.scenes
          .map((s) => ({
            ...s,
            shots: s.shots.filter((sh) => {
              if (fStatus && sh.status !== fStatus) return false
              if (fLocation && s.location?.id !== fLocation) return false
              if (fPerson && !sh.people.some((p) => p.person.id === fPerson)) return false
              if (search) {
                const q = search.toLowerCase()
                const text = `${sh.shotNumber} ${sh.shotName} ${fromRichText(sh.description)}`.toLowerCase()
                if (!text.includes(q)) return false
              }
              return true
            }),
          }))
          .filter((s) => s.shots.length > 0 || (!fStatus && !fPerson && !search && (!fLocation || s.location?.id === fLocation))),
      }))
      .filter((a) => a.scenes.length > 0)
  }, [tree.data, fAct, fStatus, fLocation, fPerson, search])

  if (tree.isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Shotlist</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            title="Save a named version of the current shotlist state"
            onClick={() => {
              const name = prompt("Name this version (e.g. 'Shotlist approved — Day 1'):")
              if (name) nameVersion.mutate({ projectId, entityType: "Shotlist", entityId: projectId, namedVersion: name })
            }}
          >
            <span className="flex items-center gap-1.5"><Bookmark size={12} /> Name version</span>
          </Button>
          <Button
            variant="ghost"
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "SHOT_LIST", format: "pdf" })}
          >
            <span className="flex items-center gap-1.5"><Download size={12} /> PDF</span>
          </Button>
          <Button
            variant="ghost"
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "SHOT_LIST", format: "csv" })}
          >
            <span className="flex items-center gap-1.5"><Download size={12} /> CSV</span>
          </Button>
          <div className="flex overflow-hidden rounded-[3px] border border-border">
            <button
              className={`cursor-pointer px-2.5 py-1.5 ${view === "table" ? "bg-surface text-text" : "text-muted"}`}
              onClick={() => setView("table")}
              title="Table view"
            >
              <Table2 size={13} />
            </button>
            <button
              className={`cursor-pointer px-2.5 py-1.5 ${view === "cards" ? "bg-surface text-text" : "text-muted"}`}
              onClick={() => setView("cards")}
              title="Cards view"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
          <Button onClick={() => setModal({ kind: "act" })}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Act</span>
          </Button>
        </div>
      </div>

      {/* Filters (§1.8: act, status, location, person) */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Select value={fAct} onChange={(e) => setFAct(e.target.value)} className="!w-40">
          <option value="">All acts</option>
          {tree.data?.map((a) => (
            <option key={a.id} value={a.id}>Act {a.number}{a.title ? ` — ${a.title}` : ""}</option>
          ))}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="!w-40">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{SHOT_STATUS[s]!.label}</option>)}
        </Select>
        <Select value={fLocation} onChange={(e) => setFLocation(e.target.value)} className="!w-44">
          <option value="">All locations</option>
          {locations.map(([lid, name]) => <option key={lid} value={lid}>{name}</option>)}
        </Select>
        <Select value={fPerson} onChange={(e) => setFPerson(e.target.value)} className="!w-40">
          <option value="">All people</option>
          {people.map(([pid, name]) => <option key={pid} value={pid}>{name}</option>)}
        </Select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shots…" className="!w-52" />
      </div>

      <ErrorNote message={error} />

      {!tree.data?.length ? (
        <EmptyState title="No acts yet" hint="Structure is Act → Scene → Shot. Start by adding Act 1." />
      ) : (
        filtered.map((act) => (
          <div key={act.id} className="mb-8">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.1em]">
                Act {act.number}
                {act.title ? <span className="ml-2 font-normal text-muted">{act.title}</span> : null}
              </h2>
              <Button variant="ghost" onClick={() => setModal({ kind: "scene", actId: act.id })}>
                <span className="flex items-center gap-1.5"><Plus size={11} /> Scene</span>
              </Button>
            </div>
            {act.scenes.map((scene) => (
              <SceneBlock
                key={scene.id}
                scene={scene}
                view={view}
                projectId={projectId}
                onAddShot={() => setModal({ kind: "shot", scene })}
                onUpdateShot={(shotId, data) => updateShot.mutate({ projectId, shotId, data })}
                onDeleteShot={(shotId) => {
                  if (confirm("Delete this shot?")) deleteShot.mutate({ projectId, shotId })
                }}
              />
            ))}
          </div>
        ))
      )}

      <CreateModals projectId={projectId} modal={modal} close={() => setModal(null)} onDone={invalidate} />
    </div>
  )
}

/* ── Scene section with shot rows / cards ─────────────────────── */

function SceneBlock({
  scene, view, projectId, onAddShot, onUpdateShot, onDeleteShot,
}: {
  scene: Scene
  view: "table" | "cards"
  projectId: string
  onAddShot: () => void
  onUpdateShot: (shotId: string, data: Record<string, unknown>) => void
  onDeleteShot: (shotId: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="mb-5 rounded-md border border-border-dim bg-surface-2">
      <div className="flex items-center gap-3 border-b border-border-dim px-4 py-2.5">
        <MonoChip color={SMPTE.white}>SC {scene.number}</MonoChip>
        <span className="font-display text-xs font-semibold">{scene.title}</span>
        <span className="text-[11px] text-muted">
          {scene.location?.name ?? "No location"} · {enumLabel(scene.daylight)}
          {scene.estimatedDuration ? ` · ~${scene.estimatedDuration} min` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={SHOT_STATUS[scene.status]} />
          <button className="cursor-pointer text-muted hover:text-text" onClick={onAddShot} title="Add shot">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {scene.shots.length === 0 ? (
        <p className="px-4 py-4 text-center text-[11px] text-faint">No shots in this scene.</p>
      ) : view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-dim text-left">
                {["", "Shot", "Size", "Lens", "Movement", "Description", "People", "Equipment", "Status", ""].map((h, i) => (
                  <th key={i} className="font-mono px-3 py-2 text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scene.shots.map((shot) => (
                <ShotRow
                  key={shot.id}
                  shot={shot}
                  projectId={projectId}
                  expanded={expanded === shot.id}
                  toggle={() => setExpanded(expanded === shot.id ? null : shot.id)}
                  onUpdate={(data) => onUpdateShot(shot.id, data)}
                  onDelete={() => onDeleteShot(shot.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {scene.shots.map((shot) => (
            <div key={shot.id} className="rounded-md border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <MonoChip color={SMPTE.cyan}>{shot.shotNumber}</MonoChip>
                <StatusBadge status={SHOT_STATUS[shot.status]} />
              </div>
              <p className="font-display mb-1 text-xs font-semibold">{shot.shotName}</p>
              <p className="mb-3 line-clamp-3 text-[11px] leading-relaxed text-muted">
                {fromRichText(shot.description) || "—"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {shot.frameSize ? <MonoChip>{shot.frameSize}</MonoChip> : null}
                {shot.lensSize ? <MonoChip>{shot.lensSize}</MonoChip> : null}
                {shot.cameraMovements.map((m) => (
                  <MonoChip key={m} color={SMPTE.blue}>{enumLabel(m)}</MonoChip>
                ))}
              </div>
              {shot.people.length ? (
                <div className="mt-3 flex gap-1">
                  {shot.people.map((p) => <Avatar key={p.person.id} name={p.person.name} />)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inlineSelect =
  "cursor-pointer rounded-[2px] border border-transparent bg-transparent px-1 py-0.5 text-xs text-text hover:border-border focus:border-smpte-cyan/60 focus:outline-none"

function ShotRow({
  shot, projectId, expanded, toggle, onUpdate, onDelete,
}: {
  shot: Shot
  projectId: string
  expanded: boolean
  toggle: () => void
  onUpdate: (data: Record<string, unknown>) => void
  onDelete: () => void
}) {
  const [desc, setDesc] = useState<string | null>(null)
  const [lens, setLens] = useState<string | null>(null)

  return (
    <>
      <tr className="border-b border-border-dim/60 align-middle hover:bg-surface">
        <td className="w-6 px-3 py-2">
          <button className="cursor-pointer text-muted hover:text-text" onClick={toggle}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </td>
        <td className="px-3 py-2">
          <span className="font-mono text-[11px] font-medium" style={{ color: SMPTE.cyan }}>
            {shot.shotNumber}
          </span>
        </td>
        <td className="px-3 py-2">
          <select
            className={`font-mono ${inlineSelect}`}
            value={shot.frameSize ?? ""}
            onChange={(e) => onUpdate({ frameSize: e.target.value || null })}
          >
            <option value="">—</option>
            {FRAME_SIZES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            className={`font-mono w-20 ${inlineSelect}`}
            value={lens ?? shot.lensSize ?? ""}
            placeholder="—"
            onChange={(e) => setLens(e.target.value)}
            onBlur={() => {
              if (lens !== null && lens !== (shot.lensSize ?? "")) onUpdate({ lensSize: lens || null })
              setLens(null)
            }}
          />
        </td>
        <td className="px-3 py-2 text-[11px] text-muted">
          {shot.cameraMovements.map((m) => enumLabel(m)).join(", ") || "—"}
        </td>
        <td className="max-w-72 px-3 py-2">
          <span className="line-clamp-2 text-[11px] leading-snug text-text/85">
            {fromRichText(shot.description) || shot.shotName}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            {shot.people.length ? shot.people.map((p) => <Avatar key={p.person.id} name={p.person.name} />) : <span className="text-faint">—</span>}
          </div>
        </td>
        <td className="px-3 py-2 text-[10px] text-muted">
          {shot.equipment.map((e) => e.equipment.name).join(", ") || "—"}
        </td>
        <td className="px-3 py-2">
          <select
            className={inlineSelect}
            value={shot.status}
            onChange={(e) => onUpdate({ status: e.target.value, filmed: e.target.value === "FILMED" || e.target.value === "APPROVED" })}
            style={{ color: SHOT_STATUS[shot.status]?.color }}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{SHOT_STATUS[s]!.label}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <button className="cursor-pointer text-faint hover:text-smpte-red" onClick={onDelete} title="Delete shot">
            <Trash2 size={12} />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-border-dim/60 bg-bg-deep/60">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <SectionLabel label="Description" />
                <Textarea
                  value={desc ?? fromRichText(shot.description)}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={() => {
                    if (desc !== null && desc !== fromRichText(shot.description)) {
                      onUpdate({ description: toRichText(desc) })
                    }
                    setDesc(null)
                  }}
                  placeholder="What happens in this shot…"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionLabel label="Production" color={SMPTE.yellow} />
                  <Link
                    href={`/projects/${projectId}/slate/${shot.id}`}
                    className="font-mono flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-smpte-green hover:underline"
                  >
                    <Clapperboard size={11} /> Slate
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2">
                    <span className="text-muted">Est. duration (s)</span>
                    <input
                      type="number"
                      className={`font-mono w-16 ${inlineSelect} border-border`}
                      defaultValue={shot.estimatedDuration ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value)
                        if (v !== shot.estimatedDuration) onUpdate({ estimatedDuration: v })
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-muted">Takes</span>
                    <input
                      type="number"
                      className={`font-mono w-14 ${inlineSelect} border-border`}
                      defaultValue={shot.takes ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value)
                        if (v !== shot.takes) onUpdate({ takes: v })
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-muted">Selected take</span>
                    <input
                      type="number"
                      className={`font-mono w-14 ${inlineSelect} border-border`}
                      defaultValue={shot.selectedTake ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value)
                        if (v !== shot.selectedTake) onUpdate({ selectedTake: v })
                      }}
                    />
                  </label>
                </div>
                {shot.props.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shot.props.map((p) => <MonoChip key={p.prop.id} color={SMPTE.magenta}>{p.prop.name}</MonoChip>)}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-5 border-t border-border-dim pt-4">
              <CommentThread projectId={projectId} entityType="Shot" entityId={shot.id} />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

/* ── Create modals (act / scene / shot) ───────────────────────── */

function CreateModals({
  projectId, modal, close, onDone,
}: {
  projectId: string
  modal: { kind: "act" } | { kind: "scene"; actId: string } | { kind: "shot"; scene: Scene } | null
  close: () => void
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const opts = {
    onSuccess: () => { onDone(); close(); setError(null) },
    onError: (e: unknown) => setError(parseApiError(e)),
  }
  const createAct = trpc.structure.createAct.useMutation(opts)
  const createScene = trpc.structure.createScene.useMutation(opts)
  const createShot = trpc.structure.createShot.useMutation(opts)
  const locations = trpc.locations.list.useQuery({ projectId }, { enabled: modal?.kind === "scene" })

  const [num, setNum] = useState("")
  const [title, setTitle] = useState("")
  const [daylight, setDaylight] = useState("MORNING")
  const [locationId, setLocationId] = useState("")
  const [frameSize, setFrameSize] = useState("")
  const [desc, setDesc] = useState("")

  const reset = () => { setNum(""); setTitle(""); setDesc(""); setFrameSize(""); setLocationId("") }

  if (!modal) return null
  return (
    <Modal
      title={modal.kind === "act" ? "New act" : modal.kind === "scene" ? "New scene" : `New shot — Scene ${modal.scene.number}`}
      open
      onClose={() => { close(); reset() }}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (modal.kind === "act") {
            createAct.mutate({ projectId, number: Number(num), title: title || undefined })
          } else if (modal.kind === "scene") {
            createScene.mutate({
              projectId, actId: modal.actId, number: num, title,
              daylight: daylight as never, locationId: locationId || null,
            })
          } else {
            createShot.mutate({
              projectId, sceneId: modal.scene.id,
              shotNumber: num || `${modal.scene.number}-${String(modal.scene.shots.length + 1).padStart(2, "0")}`,
              shotName: title,
              frameSize: (frameSize || undefined) as never,
              description: desc ? (toRichText(desc) ?? undefined) : undefined,
            })
          }
          reset()
        }}
      >
        <Field label={modal.kind === "act" ? "Act number" : modal.kind === "scene" ? "Scene number (e.g. 1A)" : "Shot number (e.g. 1A-01)"}>
          <Input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            required={modal.kind !== "shot"}
            type={modal.kind === "act" ? "number" : "text"}
            placeholder={modal.kind === "shot" ? "auto" : ""}
            autoFocus
          />
        </Field>
        <Field label={modal.kind === "shot" ? "Shot name" : "Title"}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required={modal.kind !== "act"} />
        </Field>
        {modal.kind === "scene" ? (
          <>
            <Field label="Daylight">
              <Select value={daylight} onChange={(e) => setDaylight(e.target.value)}>
                {DAYLIGHTS.map((d) => <option key={d} value={d}>{enumLabel(d)}</option>)}
              </Select>
            </Field>
            <Field label="Location">
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">No location</option>
                {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
          </>
        ) : null}
        {modal.kind === "shot" ? (
          <>
            <Field label="Frame size">
              <Select value={frameSize} onChange={(e) => setFrameSize(e.target.value)}>
                <option value="">—</option>
                {FRAME_SIZES.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Description">
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
          </>
        ) : null}
        <ErrorNote message={error} />
        <Button type="submit" className="w-full" disabled={createAct.isPending || createScene.isPending || createShot.isPending}>
          Create
        </Button>
      </form>
    </Modal>
  )
}
