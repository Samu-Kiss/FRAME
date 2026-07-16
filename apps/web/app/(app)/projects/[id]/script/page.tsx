"use client"

import { use, useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import Document from "@tiptap/extension-document"
import Text from "@tiptap/extension-text"
import History from "@tiptap/extension-history"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { Button, ErrorNote, Spinner } from "@/components/ui"
import { ScreenplayBlock, SCREENPLAY_TYPES, SCREENPLAY_LABEL, type ScreenplayType } from "@/lib/screenplay"
import { SMPTE } from "@/lib/theme"

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
