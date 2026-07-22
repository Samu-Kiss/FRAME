"use client"

import { use, useState } from "react"
import dynamic from "next/dynamic"
import { Plus, MapPin, Phone, Zap, Trash2, List, Map as MapIcon } from "lucide-react"
import { trpc } from "@/lib/trpc"

// Leaflet touches `window` — load the map only on the client.
const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => <div className="flex h-[480px] items-center justify-center rounded-md border border-border bg-surface-2 text-xs text-faint">Loading map…</div>,
})
import { parseApiError } from "@/lib/errors"
import {
  Button, Card, EmptyState, ErrorNote, Field, Input, Modal, Select, Spinner, StatusBadge, Textarea, MonoChip,
} from "@/components/ui"
import { PERMIT_STATUS, SMPTE, enumLabel } from "@/lib/theme"
import { toRichText, fromRichText } from "@/lib/richtext"

const LOCATION_TYPES = ["INTERIOR", "EXTERIOR", "STUDIO", "NATURAL", "URBAN", "RURAL", "WATER", "OTHER"]
const PERMITS = ["NOT_REQUIRED", "PENDING", "IN_PROCESS", "OBTAINED"]
// Outdoor location types get a weather forecast for the project's shoot days.
const OUTDOOR_TYPES = new Set(["EXTERIOR", "NATURAL", "URBAN", "RURAL", "WATER"])

// WMO weather code → icon (mirrors the API's weather service)
const WMO_ICON: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️", 61: "🌦️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "❄️", 75: "❄️", 80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
}

function WeatherBadge({ projectId, locationId }: { projectId: string; locationId: string }) {
  const q = trpc.weather.forecast.useQuery(
    { projectId, locationId },
    { staleTime: 30 * 60_000, retry: false } // forecast is slow-moving; don't hammer open-meteo
  )
  const forecast = q.data?.forecast
  if (!forecast?.length) return null
  return (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {forecast.map((f) => (
        <span
          key={f.date}
          title={`${f.date} · precip ${f.precipitationProb ?? "—"}% · sunset ${f.sunset ? new Date(f.sunset).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}`}
          className="font-mono inline-flex items-center gap-1 rounded-[2px] border border-border-dim bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted"
        >
          <span>{WMO_ICON[f.weatherCode] ?? "❓"}</span>
          {new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
          <span className="text-text">
            {f.tempMax != null ? Math.round(f.tempMax) : "—"}°/{f.tempMin != null ? Math.round(f.tempMin) : "—"}°
          </span>
          {f.precipitationProb != null && f.precipitationProb >= 40 ? (
            <span style={{ color: SMPTE.cyan }}>{f.precipitationProb}%</span>
          ) : null}
        </span>
      ))}
    </div>
  )
}

export default function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const utils = trpc.useUtils()
  const locations = trpc.locations.list.useQuery({ projectId })
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"list" | "map">("list")
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", type: "EXTERIOR", address: "", contactName: "", contactPhone: "",
    permitRequired: false, permitStatus: "NOT_REQUIRED", powerAvailable: false, scoutingNotes: "",
  })

  const invalidate = () => utils.locations.list.invalidate({ projectId })
  const onError = (e: unknown) => setError(parseApiError(e))
  const create = trpc.locations.create.useMutation({
    onSuccess: () => { invalidate(); setOpen(false); setError(null) },
    onError,
  })
  const update = trpc.locations.update.useMutation({ onSuccess: invalidate, onError })
  const remove = trpc.locations.delete.useMutation({ onSuccess: invalidate, onError })

  if (locations.isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em]">Locations</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-[3px] border border-border">
            <button
              className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${view === "list" ? "bg-surface text-text" : "text-muted"}`}
              onClick={() => setView("list")}
            >
              <List size={12} /> List
            </button>
            <button
              className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${view === "map" ? "bg-surface text-text" : "text-muted"}`}
              onClick={() => setView("map")}
            >
              <MapIcon size={12} /> Map
            </button>
          </div>
          <Button onClick={() => setOpen(true)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Location</span>
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      {view === "map" ? (
        <LocationMap locations={(locations.data ?? []).map((l) => ({ id: l.id, name: l.name, type: l.type, permitStatus: l.permitStatus, coordinates: l.coordinates }))} />
      ) : !locations.data?.length ? (
        <EmptyState title="No locations yet" hint="Scout, pin and document every location." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {locations.data.map((l) => (
            <Card key={l.id} className="group">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: SMPTE.cyan }} />
                  <h2 className="font-display text-sm font-bold">{l.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <MonoChip>{enumLabel(l.type)}</MonoChip>
                  <button
                    className="cursor-pointer text-faint opacity-0 transition-opacity hover:text-smpte-red group-hover:opacity-100"
                    onClick={() => { if (confirm(`Delete location "${l.name}"?`)) remove.mutate({ projectId, locationId: l.id }) }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {l.address ? <p className="mb-2 text-xs text-muted">{l.address}</p> : null}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  className="cursor-pointer rounded-[2px] border border-border bg-transparent px-1.5 py-1 text-[10px] focus:outline-none"
                  value={l.permitStatus}
                  style={{ color: PERMIT_STATUS[l.permitStatus]?.color }}
                  onChange={(e) =>
                    update.mutate({
                      projectId, locationId: l.id,
                      data: { permitStatus: e.target.value as never, permitRequired: e.target.value !== "NOT_REQUIRED" },
                    })
                  }
                >
                  {PERMITS.map((p) => <option key={p} value={p}>{PERMIT_STATUS[p]!.label}</option>)}
                </select>
                {l.powerAvailable ? (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: SMPTE.yellow }}>
                    <Zap size={10} /> Power
                  </span>
                ) : null}
                {l.contactName ? (
                  <span className="flex items-center gap-1 text-[10px] text-muted">
                    <Phone size={10} /> {l.contactName} {l.contactPhone}
                  </span>
                ) : null}
              </div>
              {fromRichText(l.scoutingNotes) ? (
                <p className="mb-2 text-[11px] leading-relaxed text-muted">{fromRichText(l.scoutingNotes)}</p>
              ) : null}
              {OUTDOOR_TYPES.has(l.type) ? <WeatherBadge projectId={projectId} locationId={l.id} /> : null}
              <div className="mt-2 flex gap-3 text-[10px] text-faint">
                <span>{l._count.scenes} scene{l._count.scenes === 1 ? "" : "s"}</span>
                {l._count.tasks > 0 ? <span className="text-smpte-red">{l._count.tasks} open task{l._count.tasks === 1 ? "" : "s"}</span> : null}
                {l.amenities.length ? <span>{l.amenities.join(" · ")}</span> : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal title="New location" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              projectId,
              name: form.name,
              type: form.type as never,
              address: form.address || null,
              contactName: form.contactName || null,
              contactPhone: form.contactPhone || null,
              permitRequired: form.permitRequired,
              permitStatus: form.permitStatus as never,
              powerAvailable: form.powerAvailable,
              scoutingNotes: form.scoutingNotes ? toRichText(form.scoutingNotes) : null,
            })
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {LOCATION_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
              </Select>
            </Field>
            <Field label="Permit">
              <Select
                value={form.permitStatus}
                onChange={(e) => setForm({ ...form, permitStatus: e.target.value, permitRequired: e.target.value !== "NOT_REQUIRED" })}
              >
                {PERMITS.map((p) => <option key={p} value={p}>{PERMIT_STATUS[p]!.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Address (optional)">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name">
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={form.powerAvailable}
              onChange={(e) => setForm({ ...form, powerAvailable: e.target.checked })}
            />
            Power available on site
          </label>
          <Field label="Scouting notes">
            <Textarea value={form.scoutingNotes} onChange={(e) => setForm({ ...form, scoutingNotes: e.target.value })} />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={create.isPending} className="w-full">Add location</Button>
        </form>
      </Modal>
    </div>
  )
}
