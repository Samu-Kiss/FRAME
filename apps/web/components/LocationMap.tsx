"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { SMPTE, PERMIT_STATUS, enumLabel } from "@/lib/theme"

export interface MapLocation {
  id: string
  name: string
  type: string
  permitStatus: string
  coordinates: unknown
}

// SMPTE-styled pin as a divIcon — sidesteps Leaflet's bundler icon-path issue
// and keeps the dark theme consistent.
function pin(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #0D0D0D;box-shadow:0 0 0 1px ${color}88"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
    popupAnchor: [0, -16],
  })
}

const TYPE_COLOR: Record<string, string> = {
  EXTERIOR: SMPTE.cyan, URBAN: SMPTE.blue, NATURAL: SMPTE.green,
  RURAL: SMPTE.green, WATER: SMPTE.cyan, INTERIOR: SMPTE.yellow,
  STUDIO: SMPTE.magenta, OTHER: "#6B6B6B",
}

export default function LocationMap({ locations }: { locations: MapLocation[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const pinned = locations
    .map((l) => {
      const c = l.coordinates as { lat?: number; lng?: number } | null
      return c && typeof c.lat === "number" && typeof c.lng === "number"
        ? { ...l, lat: c.lat, lng: c.lng }
        : null
    })
    .filter((x): x is MapLocation & { lat: number; lng: number } => x !== null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    const map = L.map(ref.current, { attributionControl: true, zoomControl: true })
    mapRef.current = map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map)

    if (pinned.length) {
      const group = L.featureGroup(
        pinned.map((l) => {
          const color = TYPE_COLOR[l.type] ?? "#6B6B6B"
          const permit = PERMIT_STATUS[l.permitStatus]
          return L.marker([l.lat, l.lng], { icon: pin(color) }).bindPopup(
            `<div style="font-family:sans-serif;min-width:140px">
               <strong style="font-size:12px">${escapeHtml(l.name)}</strong><br/>
               <span style="font-size:10px;color:#666">${enumLabel(l.type)}</span><br/>
               <span style="font-size:10px;color:${permit?.color ?? "#666"}">${permit?.label ?? l.permitStatus}</span>
             </div>`
          )
        })
      ).addTo(map)
      map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 14 })
    } else {
      map.setView([20, 0], 2)
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [pinned])

  return (
    <div className="overflow-hidden rounded-md border border-border">
      {pinned.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center bg-surface-2 text-xs text-faint">
          No locations have coordinates yet. Add lat/lng to see them on the map.
        </div>
      ) : (
        <div ref={ref} style={{ height: 480, background: "#0D0D0D" }} />
      )}
    </div>
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
