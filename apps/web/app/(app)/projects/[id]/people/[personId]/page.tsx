"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Avatar, Button, Card, ErrorNote, MonoChip, Select, Spinner } from "@/components/ui"
import { TaskBoard, NewTaskModal } from "@/components/tasks"
import { DEPARTMENT_COLOR, TASK_PRIORITY, SMPTE, enumLabel } from "@/lib/theme"

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"]

export default function PersonPage({ params }: { params: Promise<{ id: string; personId: string }> }) {
  const { id: projectId, personId } = use(params)
  const person = trpc.persons.get.useQuery({ projectId, personId })
  const tasks = trpc.tasks.list.useQuery({ projectId, personId })
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [fPriority, setFPriority] = useState("")

  const filteredTasks = useMemo(
    () => (tasks.data ?? []).filter((t) => !fPriority || t.priority === fPriority),
    [tasks.data, fPriority]
  )

  if (person.isLoading || !person.data) return <Spinner />
  const p = person.data
  const openCount = (tasks.data ?? []).filter((t) => ["PENDING", "IN_PROGRESS", "BLOCKED"].includes(t.status)).length

  return (
    <div>
      <Link href={`/projects/${projectId}/people`} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-text">
        <ArrowLeft size={12} /> People
      </Link>

      <Card className="mb-6 flex flex-wrap items-center gap-5">
        <Avatar name={p.name} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-bold">{p.name}</h1>
          <p className="text-xs text-muted">
            {p.role} · <span style={{ color: DEPARTMENT_COLOR[p.department] }}>{enumLabel(p.department)}</span>
            {p.talent?.characterName ? ` · as "${p.talent.characterName}"` : ""}
            {p.client?.companyName ? ` · ${p.client.companyName}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-faint">
            {p.email ?? "no email"} · {p.phone ?? "no phone"}
            {p.talent?.agencyName ? ` · ${p.talent.agencyName}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {p.callTime ? <MonoChip color={SMPTE.yellow}>CALL {p.callTime}</MonoChip> : null}
          {/* workload indicator (§1.8) */}
          <span
            className="font-mono text-[10px]"
            style={{ color: openCount > 3 ? SMPTE.red : openCount > 0 ? SMPTE.yellow : SMPTE.green }}
          >
            {openCount} active task{openCount === 1 ? "" : "s"}
          </span>
          {p.shotPeople.length ? (
            <span className="font-mono text-[10px] text-muted">
              {p.shotPeople.length} shot{p.shotPeople.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em]">Task board</h2>
        <div className="flex items-center gap-2">
          <Select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="!w-36">
            <option value="">All priorities</option>
            {PRIORITIES.map((pr) => (
              <option key={pr} value={pr}>{TASK_PRIORITY[pr]!.label}</option>
            ))}
          </Select>
          <Button onClick={() => setOpen(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Task</span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      <TaskBoard projectId={projectId} tasks={filteredTasks} onError={setError} />

      <NewTaskModal
        projectId={projectId}
        open={open}
        onClose={() => setOpen(false)}
        fixedOwnerId={personId}
        fixedOwnerName={p.name}
      />
    </div>
  )
}
