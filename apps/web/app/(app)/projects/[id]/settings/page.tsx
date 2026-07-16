"use client"

import { use, useState } from "react"
import { Plus, Trash2, ShieldCheck } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { parseApiError } from "@/lib/errors"
import { READ_ONLY_PERMISSIONS, FULL_PERMISSIONS, type PermissionSet } from "@frame/validators"
import {
  Avatar, Button, Card, ErrorNote, Field, Input, Modal, MonoChip, SectionLabel, Select, Spinner,
} from "@/components/ui"
import { SMPTE, enumLabel } from "@/lib/theme"

const PERMISSION_KEYS: (keyof PermissionSet)[] = [
  "canEditScript", "canEditShotlist", "canEditCameraData", "canEditSchedule", "canEditPeople",
  "canEditLocations", "canEditStyling", "canEditProps", "canExport", "canManageMembers",
]

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const project = trpc.project.get.useQuery({ projectId })
  const me = trpc.me.useQuery()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: "", projectRole: "", admin: false })
  const [perms, setPerms] = useState<PermissionSet>({ ...FULL_PERMISSIONS, canManageMembers: false, isAdmin: false })

  const invalidate = () => utils.project.get.invalidate({ projectId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const addMember = trpc.project.addMember.useMutation({
    onSuccess: () => { invalidate(); setOpen(false); setError(null) },
    onError,
  })
  const removeMember = trpc.project.removeMember.useMutation({ onSuccess: invalidate, onError })
  const archive = trpc.project.archive.useMutation({ onSuccess: invalidate, onError })

  if (project.isLoading || !project.data) return <Spinner />
  const p = project.data
  const granular = me.data?.limits.granularPermissions ?? false

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display mb-6 text-lg font-bold uppercase tracking-[0.15em]">Team &amp; Settings</h1>

      <div className="mb-4 flex items-center justify-between">
        <SectionLabel label={`Members · ${p.members.length}`} color={SMPTE.yellow} />
        {p.myPermissions.canManageMembers || p.myPermissions.isAdmin ? (
          <Button onClick={() => setOpen(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Member</span>
          </Button>
        ) : null}
      </div>

      <ErrorNote message={error} />

      <Card className="!p-0">
        <ul className="divide-y divide-border-dim">
          {p.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={m.user.name} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{m.user.name}</p>
                <p className="text-[11px] text-muted">{m.user.email} · {m.projectRole}</p>
              </div>
              {m.isAdmin ? (
                <MonoChip color={SMPTE.white}><span className="flex items-center gap-1"><ShieldCheck size={10} /> ADMIN</span></MonoChip>
              ) : (
                <MonoChip color="#6B6B6B">COLLABORATOR</MonoChip>
              )}
              {(p.myPermissions.canManageMembers || p.myPermissions.isAdmin) && m.userId !== p.ownerId ? (
                <button
                  className="cursor-pointer text-faint hover:text-smpte-red"
                  onClick={() => { if (confirm(`Remove ${m.user.name} from the project?`)) removeMember.mutate({ projectId, memberId: m.id }) }}
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {!granular ? (
        <p className="mt-3 text-[11px] text-faint">
          Granular per-module permissions are a <span className="text-smpte-cyan">Team</span> plan feature — on your plan,
          members are either admins or standard collaborators.
        </p>
      ) : null}

      {p.myPermissions.isAdmin ? (
        <div className="mt-10">
          <SectionLabel label="Danger zone" color={SMPTE.red} />
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Archive project</p>
              <p className="text-[11px] text-muted">Archived projects don't count against your plan's active project limit.</p>
            </div>
            <Button variant="danger" onClick={() => { if (confirm("Archive this project?")) archive.mutate({ projectId }) }}>
              Archive
            </Button>
          </Card>
        </div>
      ) : null}

      <Modal title="Add member" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            addMember.mutate({
              projectId,
              email: form.email,
              projectRole: form.projectRole,
              permissions: form.admin ? FULL_PERMISSIONS : granular ? { ...perms, isAdmin: false } : { ...READ_ONLY_PERMISSIONS },
            })
          }}
        >
          <Field label="User email (must have a FRAME account)">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
          </Field>
          <Field label="Project role">
            <Input value={form.projectRole} onChange={(e) => setForm({ ...form, projectRole: e.target.value })} required placeholder="e.g. Director de Fotografía" />
          </Field>
          <Field label="Access level">
            <Select value={form.admin ? "admin" : "collab"} onChange={(e) => setForm({ ...form, admin: e.target.value === "admin" })}>
              <option value="collab">Collaborator</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          {granular && !form.admin ? (
            <div className="grid grid-cols-2 gap-1.5">
              {PERMISSION_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-[11px] text-muted">
                  <input
                    type="checkbox"
                    checked={perms[key]}
                    onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                  />
                  {enumLabel(key.replace(/^can/, ""))}
                </label>
              ))}
            </div>
          ) : null}
          <ErrorNote message={error} />
          <Button type="submit" disabled={addMember.isPending} className="w-full">Add member</Button>
        </form>
      </Modal>
    </div>
  )
}
