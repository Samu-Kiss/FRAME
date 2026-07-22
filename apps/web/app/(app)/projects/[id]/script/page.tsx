"use client"

import { use, useEffect, useRef, useState } from "react"
import { Download, Wand2 } from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import Document from "@tiptap/extension-document"
import Text from "@tiptap/extension-text"
import History from "@tiptap/extension-history"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { Button, Card, ErrorNote, Modal, MonoChip, SectionLabel, Spinner } from "@/components/ui"
import { ScreenplayBlock, SCREENPLAY_TYPES, SCREENPLAY_LABEL, type ScreenplayType } from "@/lib/screenplay"
import { SMPTE, enumLabel } from "@/lib/theme"

const ScriptDoc = Document.extend({ content: "screenplayBlock+" })

export default function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const script = trpc.script.get.useQuery({ projectId })

  // The editor mounts only once the content is here — no setContent race.
  if (script.isLoading || !script.data) return <Spinner />
  return <ScriptEditor key={script.data.id} projectId={projectId} initialContent={script.data.content} />
}

function ScriptEditor({
  projectId,
  initialContent,
}: {
  projectId: string
  initialContent: unknown
}) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<"saved" | "saving" | "dirty">("saved")
  const [activeType, setActiveType] = useState<ScreenplayType>("sceneHeading")
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = trpc.script.update.useMutation({
    onSuccess: () => setSaved("saved"),
    onError: (e) => { setError(parseApiError(e)); setSaved("dirty") },
  })
  const requestExport = trpc.exports.request.useMutation({
    onSuccess: (r) => window.open(r.url, "_blank"),
    onError: (e) => setError(parseApiError(e)),
  })

  const editor = useEditor({
    extensions: [ScriptDoc, Text, History, ScreenplayBlock],
    content: initialContent as never,
    immediatelyRender: false,
    onUpdate({ editor }) {
      setSaved("dirty")
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setSaved("saving")
        update.mutate({ projectId, content: editor.getJSON() as Record<string, unknown> })
      }, 1200)
    },
    onSelectionUpdate({ editor }) {
      const type = editor.state.selection.$from.parent.attrs.blockType as ScreenplayType | undefined
      if (type) setActiveType(type)
    },
  })

  // flush pending save timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Script</h1>
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: saved === "saved" ? SMPTE.green : saved === "saving" ? SMPTE.yellow : SMPTE.red }}
          >
            {saved === "saved" ? "Saved" : saved === "saving" ? "Saving…" : "Unsaved"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setBreakdownOpen(true)}>
            <span className="flex items-center gap-1.5"><Wand2 size={12} /> Auto-breakdown</span>
          </Button>
          <Button
            variant="ghost"
            disabled={requestExport.isPending}
            onClick={() => requestExport.mutate({ projectId, type: "SCRIPT", format: "pdf" })}
          >
            <span className="flex items-center gap-1.5">
              <Download size={12} /> {requestExport.isPending ? "Generating…" : "Script PDF"}
            </span>
          </Button>
        </div>
      </div>

      <BreakdownModal projectId={projectId} open={breakdownOpen} onClose={() => setBreakdownOpen(false)} />

      {/* Block type toolbar — Tab cycles, Ctrl+1..6 jumps */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {SCREENPLAY_TYPES.map((type, i) => (
          <button
            key={type}
            className={`font-mono cursor-pointer rounded-[3px] border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
              activeType === type
                ? "border-smpte-cyan/60 bg-smpte-cyan/10 text-smpte-cyan"
                : "border-border text-muted hover:border-muted hover:text-text"
            }`}
            title={`Ctrl+${i + 1}`}
            onClick={() => {
              editor?.chain().focus().setScreenplayType(type).run()
              setActiveType(type)
            }}
          >
            {SCREENPLAY_LABEL[type]}
          </button>
        ))}
        <span className="font-mono ml-auto self-center text-[9px] text-faint">
          TAB cycles type · ENTER advances
        </span>
      </div>

      <ErrorNote message={error} />

      <div className="screenplay rounded-md border border-border bg-bg-deep px-10 py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

/* ── Auto-breakdown: parse the script into draft scenes + characters ── */

function BreakdownModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils()
  const preview = trpc.breakdown.preview.useQuery({ projectId }, { enabled: open })
  const [error, setError] = useState<string | null>(null)
  const [createScenes, setCreateScenes] = useState(true)
  const [createCharacters, setCreateCharacters] = useState(true)
  const [done, setDone] = useState<{ scenesCreated: number; charactersCreated: number } | null>(null)

  const apply = trpc.breakdown.applyBreakdown.useMutation({
    onSuccess: (r) => {
      setDone(r)
      utils.structure.tree.invalidate({ projectId })
      utils.persons.list.invalidate({ projectId })
    },
    onError: (e) => setError(parseApiError(e)),
  })

  const scenes = preview.data?.scenes ?? []
  const characters = preview.data?.characters ?? []
  const newScenes = scenes.filter((s) => !s.exists).length
  const newChars = characters.filter((c) => !c.exists).length

  return (
    <Modal title="Auto-breakdown" open={open} onClose={onClose} wide>
      {preview.isLoading ? (
        <Spinner />
      ) : done ? (
        <div className="space-y-4 text-center">
          <p className="font-display text-sm font-bold" style={{ color: SMPTE.green }}>
            Created {done.scenesCreated} scene{done.scenesCreated === 1 ? "" : "s"} and {done.charactersCreated} character{done.charactersCreated === 1 ? "" : "s"}.
          </p>
          <p className="text-[11px] text-muted">Find them in the Shotlist and People modules to refine.</p>
          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      ) : scenes.length === 0 && characters.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">
          No scene headings found. Write scene headings like <span className="font-mono text-smpte-cyan">INT. ROOFTOP - NIGHT</span> in the script, then run this again.
        </p>
      ) : (
        <div className="space-y-5">
          <p className="text-[11px] text-muted">
            Parsed from your screenplay — scene headings (INT./EXT.), characters and time-of-day. Rule-based, deterministic; nothing is created until you apply.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <SectionLabel label={`Scenes · ${scenes.length} (${newScenes} new)`} color={SMPTE.blue} />
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {scenes.map((s, i) => (
                  <Card key={i} className="!p-2.5">
                    <div className="flex items-center gap-2">
                      {s.intExt ? <MonoChip color={SMPTE.cyan}>{s.intExt}</MonoChip> : null}
                      <span className="font-display text-[11px] font-semibold">{s.location}</span>
                      <MonoChip color="#6B6B6B">{enumLabel(s.daylight)}</MonoChip>
                      {s.exists ? <span className="font-mono ml-auto text-[9px] text-faint">exists</span> : <span className="font-mono ml-auto text-[9px] text-smpte-green">new</span>}
                    </div>
                    {s.characters.length ? (
                      <p className="mt-1 text-[10px] text-muted">{s.characters.join(", ")}</p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel label={`Characters · ${characters.length} (${newChars} new)`} color={SMPTE.yellow} />
              <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto">
                {characters.map((c) => (
                  <MonoChip key={c.name} color={c.exists ? "#6B6B6B" : SMPTE.yellow}>{c.name}</MonoChip>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border-dim pt-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={createScenes} onChange={(e) => setCreateScenes(e.target.checked)} />
              Create {newScenes} new scene{newScenes === 1 ? "" : "s"}
            </label>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={createCharacters} onChange={(e) => setCreateCharacters(e.target.checked)} />
              Create {newChars} new character{newChars === 1 ? "" : "s"} as talent
            </label>
          </div>

          <ErrorNote message={error} />
          <Button
            className="w-full"
            disabled={apply.isPending || (!createScenes && !createCharacters)}
            onClick={() => apply.mutate({ projectId, createScenes, createCharacters })}
          >
            {apply.isPending ? "Applying…" : "Apply breakdown"}
          </Button>
        </div>
      )}
    </Modal>
  )
}
