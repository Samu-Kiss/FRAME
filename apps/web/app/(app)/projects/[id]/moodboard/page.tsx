"use client"

import { use, useRef, useState } from "react"
import { ImagePlus, Palette, StickyNote, Link2, Trash2, LayoutGrid, Move } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { getAccessToken } from "@/lib/supabase"
import { parseApiError } from "@/lib/errors"
import { Button, ErrorNote, Select, Spinner } from "@/components/ui"
import { SMPTE } from "@/lib/theme"

type Board = RouterOutputs["moodboard"]["get"]
type Item = Board["items"][number]

export default function MoodboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [sceneId, setSceneId] = useState("")
  const tree = trpc.structure.tree.useQuery({ projectId })
  const board = trpc.moodboard.get.useQuery({ projectId, sceneId: sceneId || undefined })
  const [error, setError] = useState<string | null>(null)
  const scenes = (tree.data ?? []).flatMap((a) => a.scenes)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Moodboard</h1>
          <Select value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="!w-56">
            <option value="">Project board</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>SC {s.number} — {s.title}</option>
            ))}
          </Select>
        </div>
      </div>
      <ErrorNote message={error} />
      {board.isLoading || !board.data ? (
        <Spinner />
      ) : (
        <BoardView key={board.data.id} projectId={projectId} board={board.data} onError={setError} />
      )}
    </div>
  )
}

function BoardView({ projectId, board, onError }: { projectId: string; board: Board; onError: (m: string | null) => void }) {
  const utils = trpc.useUtils()
  const invalidate = () => utils.moodboard.get.invalidate()
  const handleError = (e: unknown) => onError(parseApiError(e))
  const addItem = trpc.moodboard.addItem.useMutation({ onSuccess: invalidate, onError: handleError })
  const updateItem = trpc.moodboard.updateItem.useMutation({ onError: handleError })
  const deleteItem = trpc.moodboard.deleteItem.useMutation({ onSuccess: invalidate, onError: handleError })
  const setLayout = trpc.moodboard.setLayout.useMutation({ onSuccess: invalidate, onError: handleError })

  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  // local drag positions so dragging is smooth without waiting on the server
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  async function uploadImage(file: File) {
    setUploading(true)
    onError(null)
    try {
      const token = await getAccessToken()
      const form = new FormData()
      form.append("projectId", projectId)
      form.append("scope", "moodboard")
      form.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001"}/upload`, {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "UPLOAD_FAILED")
      const { assetId } = (await res.json()) as { assetId: string }
      addItem.mutate({ projectId, boardId: board.id, type: "IMAGE", assetId })
    } catch (e) {
      handleError(e)
    } finally {
      setUploading(false)
    }
  }

  function startDrag(e: React.PointerEvent, item: Item) {
    if (board.layout !== "freeform") return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const startX = e.clientX
    const startY = e.clientY
    const origX = positions[item.id]?.x ?? item.posX
    const origY = positions[item.id]?.y ?? item.posY

    const onMove = (ev: PointerEvent) => {
      const x = Math.max(0, origX + ev.clientX - startX)
      const y = Math.max(0, origY + ev.clientY - startY)
      setPositions((p) => ({ ...p, [item.id]: { x, y } }))
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      const x = Math.max(0, origX + ev.clientX - startX)
      const y = Math.max(0, origY + ev.clientY - startY)
      updateItem.mutate({ projectId, itemId: item.id, data: { posX: x, posY: y } })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const freeform = board.layout === "freeform"
  const canvasHeight = freeform
    ? Math.max(560, ...board.items.map((i) => (positions[i.id]?.y ?? i.posY) + i.height + 60))
    : undefined

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" disabled={uploading} onClick={() => fileInput.current?.click()}>
          <span className="flex items-center gap-1.5"><ImagePlus size={12} /> {uploading ? "Uploading…" : "Image"}</span>
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = "" }}
        />
        <Button
          variant="ghost"
          onClick={() => {
            const color = prompt("Hex color (e.g. #EFC000):", "#EFC000")
            if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
              addItem.mutate({ projectId, boardId: board.id, type: "COLOR_SWATCH", color })
            }
          }}
        >
          <span className="flex items-center gap-1.5"><Palette size={12} /> Swatch</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const text = prompt("Note:")
            if (text) addItem.mutate({ projectId, boardId: board.id, type: "TEXT_NOTE", content: text })
          }}
        >
          <span className="flex items-center gap-1.5"><StickyNote size={12} /> Note</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const url = prompt("Reference URL (Instagram, Pinterest, Vimeo…):")
            if (url) addItem.mutate({ projectId, boardId: board.id, type: "URL_EMBED", content: url })
          }}
        >
          <span className="flex items-center gap-1.5"><Link2 size={12} /> URL</span>
        </Button>

        <div className="ml-auto flex overflow-hidden rounded-[3px] border border-border">
          <button
            className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${freeform ? "bg-surface text-text" : "text-muted"}`}
            onClick={() => setLayout.mutate({ projectId, boardId: board.id, layout: "freeform" })}
          >
            <Move size={11} /> Freeform
          </button>
          <button
            className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${!freeform ? "bg-surface text-text" : "text-muted"}`}
            onClick={() => setLayout.mutate({ projectId, boardId: board.id, layout: "grid" })}
          >
            <LayoutGrid size={11} /> Grid
          </button>
        </div>
      </div>

      {board.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-24 text-center">
          <p className="font-display text-sm font-semibold text-muted">Pin your first reference</p>
          <p className="mt-1 text-xs text-faint">Images, color swatches, notes and URLs — drag them freely.</p>
        </div>
      ) : freeform ? (
        <div
          ref={canvasRef}
          className="relative overflow-hidden rounded-md border border-border-dim bg-bg-deep"
          style={{ height: canvasHeight, backgroundImage: "radial-gradient(#1a1a1a 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        >
          {board.items.map((item) => {
            const pos = positions[item.id] ?? { x: item.posX, y: item.posY }
            return (
              <div
                key={item.id}
                className="group absolute cursor-grab active:cursor-grabbing"
                style={{ left: pos.x, top: pos.y, width: item.width }}
                onPointerDown={(e) => startDrag(e, item)}
              >
                <ItemCard item={item} onDelete={() => deleteItem.mutate({ projectId, itemId: item.id })} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {board.items.map((item) => (
            <div key={item.id} className="group">
              <ItemCard item={item} fill onDelete={() => deleteItem.mutate({ projectId, itemId: item.id })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, fill = false, onDelete }: { item: Item; fill?: boolean; onDelete: () => void }) {
  const h = fill ? 180 : item.height
  return (
    <div
      className="relative overflow-hidden rounded-[4px] border border-border bg-surface shadow-lg"
      style={{ height: h }}
    >
      <button
        className="absolute right-1.5 top-1.5 z-10 cursor-pointer rounded bg-black/60 p-1 text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        title="Remove"
      >
        <Trash2 size={11} />
      </button>

      {item.type === "IMAGE" && item.asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.asset.publicUrl} alt={item.asset.alt ?? item.asset.filename} className="h-full w-full object-cover" draggable={false} />
      ) : item.type === "COLOR_SWATCH" ? (
        <div className="flex h-full items-end p-2" style={{ background: item.color ?? "#333" }}>
          <span className="font-mono rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{item.color}</span>
        </div>
      ) : item.type === "TEXT_NOTE" ? (
        <div className="h-full overflow-hidden p-3">
          <p className="text-[11px] leading-relaxed text-text/90">{item.content}</p>
        </div>
      ) : (
        <a
          href={item.content ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex h-full flex-col justify-between p-3 hover:bg-surface-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Link2 size={14} style={{ color: SMPTE.cyan }} />
          <span className="truncate text-[10px] text-smpte-cyan underline">{item.content}</span>
        </a>
      )}
      {item.caption ? (
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
          <span className="text-[9px] text-white/85">{item.caption}</span>
        </div>
      ) : null}
    </div>
  )
}
