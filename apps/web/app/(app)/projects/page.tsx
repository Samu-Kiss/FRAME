"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Users, Calendar, Film } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner, StatusBadge, MonoChip,
} from "@/components/ui"
import { useI18n } from "@/lib/i18n"
import { PROJECT_STATUS, SMPTE, enumLabel } from "@/lib/theme"

const PROJECT_TYPES = ["COMMERCIAL", "MUSIC_VIDEO", "SHORT_FILM", "FEATURE_FILM", "DOCUMENTARY", "CONTENT", "OTHER"]

export default function ProjectsPage() {
  const utils = trpc.useUtils()
  const { t } = useI18n()
  const projects = trpc.project.list.useQuery()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("COMMERCIAL")
  const [client, setClient] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"blank" | "demo" | "clone">("blank")
  const [cloneId, setCloneId] = useState("")
  const router = useRouter()
  const templates = trpc.project.listTemplates.useQuery(undefined, { enabled: open })

  const onCreated = () => {
    utils.project.list.invalidate()
    setOpen(false)
    setTitle("")
    setClient("")
    setSource("blank")
    setCloneId("")
    setError(null)
  }
  const create = trpc.project.create.useMutation({ onSuccess: onCreated, onError: (e) => setError(parseApiError(e)) })
  const createFromTemplate = trpc.project.createFromTemplate.useMutation({
    onSuccess: (r) => { onCreated(); router.push(`/projects/${r.id}`) },
    onError: (e) => setError(parseApiError(e)),
  })
  const busy = create.isPending || createFromTemplate.isPending

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">{t("common.projects")}</h1>
        <Button onClick={() => setOpen(true)}>
          <span className="flex items-center gap-2">
            <Plus size={13} /> {t("common.newProject")}
          </span>
        </Button>
      </div>

      {projects.isLoading ? (
        <Spinner />
      ) : !projects.data?.length ? (
        <EmptyState title="No projects yet" hint="Create your first production to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((p) => {
            const pct = p.shotStats.total ? Math.round((p.shotStats.filmed / p.shotStats.total) * 100) : 0
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full transition-colors hover:border-muted">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="font-display text-sm font-bold">{p.title}</h2>
                    <StatusBadge status={PROJECT_STATUS[p.status]} />
                  </div>
                  <p className="mb-4 text-xs text-muted">
                    {enumLabel(p.type)}
                    {p.client ? ` · ${p.client}` : ""}
                  </p>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Shots filmed</span>
                    <span className="font-mono text-[10px]" style={{ color: SMPTE.green }}>
                      {p.shotStats.filmed}/{p.shotStats.total} · {pct}%
                    </span>
                  </div>
                  <div className="mb-4 h-1 overflow-hidden rounded bg-border-dim">
                    <div className="h-full" style={{ width: `${pct}%`, background: SMPTE.green }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted">
                    <span className="flex items-center gap-1"><Users size={11} /> {p._count.persons}</span>
                    <span className="flex items-center gap-1"><Film size={11} /> {p._count.acts} acts</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {p._count.productionDays} days</span>
                    {p.creationSource === "demo_template" ? <MonoChip color={SMPTE.yellow}>DEMO</MonoChip> : null}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Modal title="New project" open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (source === "blank") {
              create.mutate({ title, type: type as never, client: client || undefined })
            } else {
              const sourceProjectId = source === "demo" ? templates.data?.demo?.id : cloneId
              if (!sourceProjectId) { setError("Select a project to copy from."); return }
              createFromTemplate.mutate({ title, source, sourceProjectId })
            }
          }}
          className="space-y-4"
        >
          {/* Source picker (§1.10 v2.0) */}
          <Field label="Start from">
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "blank", label: "Blank", desc: "Empty project" },
                { key: "demo", label: "Demo", desc: "Explore a sample" },
                { key: "clone", label: "Clone", desc: "Copy your own" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSource(opt.key)}
                  className={`rounded-[3px] border px-3 py-2.5 text-left transition-colors ${
                    source === opt.key ? "border-smpte-cyan/60 bg-smpte-cyan/10" : "border-border hover:border-muted"
                  }`}
                >
                  <div className="font-display text-[11px] font-semibold uppercase tracking-wider">{opt.label}</div>
                  <div className="mt-0.5 text-[9px] text-muted">{opt.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Production title" />
          </Field>

          {source === "blank" ? (
            <>
              <Field label="Type">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>{enumLabel(t)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Client (optional)">
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" />
              </Field>
            </>
          ) : source === "demo" ? (
            <p className="rounded-[3px] border border-border-dim bg-surface-2 px-3 py-2 text-[11px] text-muted">
              Copies the demo production{templates.data?.demo ? ` "${templates.data.demo.title}"` : ""} — a fully populated
              example with scenes, shots, people, locations and a shoot day to explore.
            </p>
          ) : (
            <Field label="Project to clone">
              <Select value={cloneId} onChange={(e) => setCloneId(e.target.value)} required>
                <option value="">Select one of your projects…</option>
                {(templates.data?.own ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.title} · {p._count.acts} acts · {p._count.persons} people</option>
                ))}
              </Select>
            </Field>
          )}

          <ErrorNote message={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : source === "blank" ? "Create project" : "Copy project"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
