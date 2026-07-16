"use client"

import { useState } from "react"
import { Trash2, UserPlus } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import {
  Avatar, Button, ErrorNote, Field, Input, Modal, MonoChip, Select, StatusBadge, Textarea,
} from "@/components/ui"
import { TASK_PRIORITY, TASK_STATUS, SMPTE, enumLabel } from "@/lib/theme"
import { toRichText, fromRichText } from "@/lib/richtext"

export type TaskItem = RouterOutputs["tasks"]["list"][number]
export type PersonItem = RouterOutputs["persons"]["list"][number]

const KANBAN_COLUMNS = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE"] as const
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"]

/* ── Kanban board (shared by the person profile and the project-wide view) ── */

export function TaskBoard({
  projectId,
  tasks,
  showOwner = false,
  onError,
}: {
  projectId: string
  tasks: TaskItem[]
  showOwner?: boolean
  onError: (message: string) => void
}) {
  const utils = trpc.useUtils()
  const invalidate = () => {
    utils.tasks.list.invalidate()
    utils.persons.list.invalidate({ projectId })
  }
  const handleError = (e: unknown) => onError(parseApiError(e))
  const updateTask = trpc.tasks.update.useMutation({ onSuccess: invalidate, onError: handleError })
  const deleteTask = trpc.tasks.delete.useMutation({ onSuccess: invalidate, onError: handleError })
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)

  return (
    <>
    {editingTask ? (
      <EditAssigneesModal projectId={projectId} task={editingTask} onClose={() => setEditingTask(null)} />
    ) : null}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col)
        const style = TASK_STATUS[col]!
        return (
          <div key={col} className="rounded-md border border-border-dim bg-surface-2">
            <div className="flex items-center justify-between border-b border-border-dim px-3 py-2.5">
              <StatusBadge status={style} />
              <span className="font-mono text-[10px] text-muted">{colTasks.length}</span>
            </div>
            <div className="space-y-2 p-2.5">
              {colTasks.map((t) => (
                <div key={t.id} className="group rounded-[3px] border border-border bg-surface p-3">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-snug">{t.title}</p>
                    <button
                      className="shrink-0 cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                      onClick={() => deleteTask.mutate({ projectId, taskId: t.id })}
                      title="Delete task"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {fromRichText(t.description) ? (
                    <p className="mb-2 line-clamp-2 text-[10px] leading-relaxed text-muted">
                      {fromRichText(t.description)}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <MonoChip color={TASK_PRIORITY[t.priority]!.color}>{t.priority}</MonoChip>
                    {t.dueDate ? (
                      <MonoChip color={new Date(t.dueDate) < new Date() && col !== "DONE" ? SMPTE.red : "#6B6B6B"}>
                        {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </MonoChip>
                    ) : null}
                    {t.linkedEntityType ? <MonoChip color={SMPTE.cyan}>{t.linkedEntityType}</MonoChip> : null}
                  </div>
                  {showOwner && t.person ? (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Avatar name={t.person.name} size={16} />
                      <span className="text-[10px] text-muted">{t.person.name}</span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-2 flex cursor-pointer items-center gap-1"
                    title={
                      t.assignees.length
                        ? `Assigned: ${t.assignees.map((a) => a.person.name).join(", ")} — click to edit`
                        : "Assign people to this task"
                    }
                    onClick={() => setEditingTask(t)}
                  >
                    {t.assignees.length ? (
                      <>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-faint">→</span>
                        {t.assignees.map((a) => (
                          <Avatar key={a.person.id} name={a.person.name} size={16} />
                        ))}
                        <UserPlus size={11} className="ml-1 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100">
                        <UserPlus size={11} /> Assign
                      </span>
                    )}
                  </button>
                  <select
                    className="mt-2 w-full cursor-pointer rounded-[2px] border border-border-dim bg-transparent px-1.5 py-1 text-[10px] text-muted focus:outline-none"
                    value={t.status}
                    onChange={(e) =>
                      updateTask.mutate({ projectId, taskId: t.id, data: { status: e.target.value as never } })
                    }
                  >
                    {Object.keys(TASK_STATUS).map((s) => (
                      <option key={s} value={s}>{TASK_STATUS[s]!.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              {colTasks.length === 0 ? <p className="py-4 text-center text-[10px] text-faint">Empty</p> : null}
            </div>
          </div>
        )
      })}
    </div>
    </>
  )
}

/* ── Edit assignees of an existing task ───────────────────────── */

function EditAssigneesModal({
  projectId,
  task,
  onClose,
}: {
  projectId: string
  task: TaskItem
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const persons = trpc.persons.list.useQuery({ projectId })
  const [error, setError] = useState<string | null>(null)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignees.map((a) => a.person.id))

  const update = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      utils.persons.list.invalidate({ projectId })
      onClose()
    },
    onError: (e) => setError(parseApiError(e)),
  })

  return (
    <Modal title={`Assignees — ${task.title}`} open onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          update.mutate({ projectId, taskId: task.id, data: {}, assigneeIds })
        }}
      >
        {task.person ? (
          <p className="flex items-center gap-2 text-[11px] text-muted">
            <Avatar name={task.person.name} size={16} />
            Owner: {task.person.name} — always sees this task on their board.
          </p>
        ) : null}
        <Field label={`Assigned to (${assigneeIds.length} selected)`}>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-[3px] border border-border bg-surface-2 p-2.5">
            {(persons.data ?? [])
              .filter((pp) => pp.id !== task.person?.id)
              .map((pp) => (
                <label key={pp.id} className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-text">
                  <input
                    type="checkbox"
                    checked={assigneeIds.includes(pp.id)}
                    onChange={(e) =>
                      setAssigneeIds(
                        e.target.checked
                          ? [...assigneeIds, pp.id]
                          : assigneeIds.filter((id) => id !== pp.id)
                      )
                    }
                  />
                  <Avatar name={pp.name} size={16} />
                  {pp.name}
                  <span className="text-faint">· {pp.role}</span>
                </label>
              ))}
          </div>
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" disabled={update.isPending} className="w-full">
          {update.isPending ? "Saving…" : "Save assignees"}
        </Button>
      </form>
    </Modal>
  )
}

/* ── New task modal — owner picker unless one is fixed ────────── */

export function NewTaskModal({
  projectId,
  open,
  onClose,
  fixedOwnerId,
  fixedOwnerName,
}: {
  projectId: string
  open: boolean
  onClose: () => void
  fixedOwnerId?: string
  fixedOwnerName?: string
}) {
  const utils = trpc.useUtils()
  const persons = trpc.persons.list.useQuery({ projectId }, { enabled: open })
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", dueDate: "" })
  const [ownerId, setOwnerId] = useState<string>("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  const effectiveOwner = fixedOwnerId ?? (ownerId || null)

  const create = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      utils.persons.list.invalidate({ projectId })
      setForm({ title: "", description: "", priority: "MEDIUM", dueDate: "" })
      setOwnerId("")
      setAssigneeIds([])
      setError(null)
      onClose()
    },
    onError: (e) => setError(parseApiError(e)),
  })

  return (
    <Modal
      title={fixedOwnerName ? `New task — ${fixedOwnerName}` : "New task"}
      open={open}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({
            projectId,
            personId: effectiveOwner,
            assigneeIds,
            title: form.title,
            description: form.description ? toRichText(form.description) : undefined,
            priority: form.priority as never,
            dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
          })
        }}
      >
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
        </Field>
        <Field label="Description (optional)">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        {!fixedOwnerId ? (
          <Field label="Owner (whose board it lives on)">
            <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">— Unassigned —</option>
              {(persons.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.role}</option>
              ))}
            </Select>
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((pr) => <option key={pr} value={pr}>{enumLabel(pr)}</option>)}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
        <Field label={`Also assign to (${assigneeIds.length} selected)`}>
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-[3px] border border-border bg-surface-2 p-2.5">
            {(persons.data ?? [])
              .filter((pp) => pp.id !== effectiveOwner)
              .map((pp) => (
                <label key={pp.id} className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-text">
                  <input
                    type="checkbox"
                    checked={assigneeIds.includes(pp.id)}
                    onChange={(e) =>
                      setAssigneeIds(
                        e.target.checked
                          ? [...assigneeIds, pp.id]
                          : assigneeIds.filter((id) => id !== pp.id)
                      )
                    }
                  />
                  <Avatar name={pp.name} size={16} />
                  {pp.name}
                  <span className="text-faint">· {pp.role}</span>
                </label>
              ))}
          </div>
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" disabled={create.isPending} className="w-full">Create task</Button>
      </form>
    </Modal>
  )
}
