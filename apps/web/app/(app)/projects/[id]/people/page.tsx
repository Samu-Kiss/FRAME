"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Users, KanbanSquare } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Avatar, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, MonoChip, Select, Spinner,
} from "@/components/ui"
import { TaskBoard, NewTaskModal } from "@/components/tasks"
import { DEPARTMENT_COLOR, TASK_PRIORITY, SMPTE, enumLabel } from "@/lib/theme"

const DEPARTMENTS = [
  "DIRECTION", "PRODUCTION", "PHOTOGRAPHY", "ART", "MAKEUP_HAIR", "WARDROBE", "SOUND", "POST", "TALENT", "CLIENT", "OTHER",
]
const PERSON_TYPES = ["CREW", "TALENT", "POST_CREW", "CLIENT"]
const CREW_TYPES = ["HEAD_OF_DEPARTMENT", "OPERATOR", "ASSISTANT"]
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"]

export default function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [view, setView] = useState<"people" | "board">("people")
  const [taskModal, setTaskModal] = useState(false)
  const [personModal, setPersonModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">People &amp; Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-[3px] border border-border">
            <button
              className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${view === "people" ? "bg-surface text-text" : "text-muted"}`}
              onClick={() => setView("people")}
            >
              <Users size={12} /> People
            </button>
            <button
              className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${view === "board" ? "bg-surface text-text" : "text-muted"}`}
              onClick={() => setView("board")}
            >
              <KanbanSquare size={12} /> Task Board
            </button>
          </div>
          <Button variant="ghost" onClick={() => setTaskModal(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Task</span>
          </Button>
          <Button onClick={() => setPersonModal(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Person</span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      {view === "people" ? (
        <PeopleList projectId={projectId} />
      ) : (
        <ProjectTaskBoard projectId={projectId} onError={setError} />
      )}

      <NewTaskModal projectId={projectId} open={taskModal} onClose={() => setTaskModal(false)} />
      <NewPersonModal projectId={projectId} open={personModal} onClose={() => setPersonModal(false)} />
    </div>
  )
}

/* ── People directory ─────────────────────────────────────────── */

function PeopleList({ projectId }: { projectId: string }) {
  const persons = trpc.persons.list.useQuery({ projectId })

  const byDepartment = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof persons.data>>()
    persons.data?.forEach((p) => {
      const list = groups.get(p.department) ?? []
      list.push(p)
      groups.set(p.department, list)
    })
    return [...groups.entries()]
  }, [persons.data])

  if (persons.isLoading) return <Spinner />
  if (!persons.data?.length) {
    return <EmptyState title="No people yet" hint="Add talent, crew, post and client contacts." />
  }

  return (
    <>
      {byDepartment.map(([dept, list]) => (
        <div key={dept} className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <div style={{ width: 3, height: 13, background: DEPARTMENT_COLOR[dept], borderRadius: 1 }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {enumLabel(dept)} · {list.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => (
              <Link key={p.id} href={`/projects/${projectId}/people/${p.id}`}>
                <Card className="flex h-full items-center gap-3 !p-4 transition-colors hover:border-muted">
                  <Avatar name={p.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate text-xs font-semibold">{p.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {p.role}
                      {p.talent?.characterName ? ` · as "${p.talent.characterName}"` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {p.callTime ? <MonoChip color={SMPTE.yellow}>{p.callTime}</MonoChip> : null}
                    {(() => {
                      const open = p._count.tasks + p._count.taskAssignments
                      return open > 0 ? (
                        <span className="font-mono text-[10px] text-smpte-red">{open} open</span>
                      ) : (
                        <span className="font-mono text-[10px] text-faint">0 open</span>
                      )
                    })()}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

/* ── Project-wide task board ──────────────────────────────────── */

function ProjectTaskBoard({ projectId, onError }: { projectId: string; onError: (m: string) => void }) {
  const tasks = trpc.tasks.list.useQuery({ projectId })
  const persons = trpc.persons.list.useQuery({ projectId })
  const [fPriority, setFPriority] = useState("")
  const [fPerson, setFPerson] = useState("")

  const filtered = useMemo(
    () =>
      (tasks.data ?? []).filter((t) => {
        if (fPriority && t.priority !== fPriority) return false
        if (fPerson && t.person?.id !== fPerson && !t.assignees.some((a) => a.person.id === fPerson)) return false
        return true
      }),
    [tasks.data, fPriority, fPerson]
  )

  if (tasks.isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={fPerson} onChange={(e) => setFPerson(e.target.value)} className="!w-48">
          <option value="">Everyone</option>
          {(persons.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="!w-40">
          <option value="">All priorities</option>
          {PRIORITIES.map((pr) => (
            <option key={pr} value={pr}>{TASK_PRIORITY[pr]!.label}</option>
          ))}
        </Select>
      </div>
      {!filtered.length ? (
        <EmptyState title="No tasks match" hint="Create a task with the button above — assign an owner and as many people as needed." />
      ) : (
        <TaskBoard projectId={projectId} tasks={filtered} showOwner onError={onError} />
      )}
    </div>
  )
}

/* ── New person modal ─────────────────────────────────────────── */

function NewPersonModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", email: "", role: "", department: "PRODUCTION", type: "CREW",
    crewType: "OPERATOR", characterName: "", companyName: "",
  })

  const create = trpc.persons.create.useMutation({
    onSuccess: () => {
      utils.persons.list.invalidate({ projectId })
      setError(null)
      setForm({ name: "", email: "", role: "", department: "PRODUCTION", type: "CREW", crewType: "OPERATOR", characterName: "", companyName: "" })
      onClose()
    },
    onError: (e) => setError(parseApiError(e)),
  })

  return (
    <Modal title="New person" open={open} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({
            projectId,
            name: form.name,
            email: form.email || null,
            role: form.role,
            department: form.department as never,
            type: form.type as never,
            crew: form.type === "CREW" ? { crewType: form.crewType as never } : undefined,
            talent: form.type === "TALENT" ? { characterName: form.characterName || null } : undefined,
            postCrew: form.type === "POST_CREW" ? {} : undefined,
            client: form.type === "CLIENT" ? { companyName: form.companyName || "—" } : undefined,
          })
        }}
      >
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {PERSON_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{enumLabel(d)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Role">
          <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required placeholder="e.g. Gaffer, Lead, Editor" />
        </Field>
        <Field label="Email (optional)">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        {form.type === "CREW" ? (
          <Field label="Crew type">
            <Select value={form.crewType} onChange={(e) => setForm({ ...form, crewType: e.target.value })}>
              {CREW_TYPES.map((c) => <option key={c} value={c}>{enumLabel(c)}</option>)}
            </Select>
          </Field>
        ) : null}
        {form.type === "TALENT" ? (
          <Field label="Character name (optional)">
            <Input value={form.characterName} onChange={(e) => setForm({ ...form, characterName: e.target.value })} />
          </Field>
        ) : null}
        {form.type === "CLIENT" ? (
          <Field label="Company">
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
          </Field>
        ) : null}
        <ErrorNote message={error} />
        <Button type="submit" disabled={create.isPending} className="w-full">Add person</Button>
      </form>
    </Modal>
  )
}
