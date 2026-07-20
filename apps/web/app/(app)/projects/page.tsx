"use client"

import { useState } from "react"
import Link from "next/link"
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

  const create = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      setOpen(false)
      setTitle("")
      setClient("")
      setError(null)
    },
    onError: (e) => setError(parseApiError(e)),
  })

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
            create.mutate({ title, type: type as never, client: client || undefined })
          }}
          className="space-y-4"
        >
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Production title" />
          </Field>
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
          <ErrorNote message={error} />
          <Button type="submit" disabled={create.isPending} className="w-full">
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
