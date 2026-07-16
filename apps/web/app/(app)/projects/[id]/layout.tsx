"use client"

import { use } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, List, Users, MapPin, Package, Camera, Calendar, History, Settings, Layers, FileText, Image as ImageIcon,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { StatusBadge } from "@/components/ui"
import { PROJECT_STATUS, SMPTE } from "@/lib/theme"

const NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard, color: SMPTE.white },
  { href: "/script", label: "Script", icon: FileText, color: SMPTE.white },
  { href: "/shotlist", label: "Shotlist", icon: List, color: SMPTE.blue },
  { href: "/moodboard", label: "Moodboard", icon: ImageIcon, color: SMPTE.magenta },
  { href: "/people", label: "People & Tasks", icon: Users, color: SMPTE.yellow },
  { href: "/locations", label: "Locations", icon: MapPin, color: SMPTE.cyan },
  { href: "/props", label: "Props", icon: Package, color: SMPTE.magenta },
  { href: "/stylings", label: "Styling", icon: Layers, color: SMPTE.magenta },
  { href: "/equipment", label: "Equipment", icon: Camera, color: SMPTE.cyan },
  { href: "/schedule", label: "Production Days", icon: Calendar, color: SMPTE.blue },
  { href: "/changelog", label: "Changelog", icon: History, color: SMPTE.green },
  { href: "/settings", label: "Team & Settings", icon: Settings, color: "#6B6B6B" },
]

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const pathname = usePathname()
  const project = trpc.project.get.useQuery({ projectId: id })
  const base = `/projects/${id}`

  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-border-dim bg-bg-deep">
        <div className="border-b border-border-dim px-4 py-4">
          <p className="font-display truncate text-xs font-bold" title={project.data?.title}>
            {project.data?.title ?? "…"}
          </p>
          <div className="mt-2">
            {project.data ? <StatusBadge status={PROJECT_STATUS[project.data.status]} /> : null}
          </div>
        </div>
        <nav className="p-2">
          {NAV.map((item) => {
            const href = `${base}${item.href}`
            const active = item.href === "" ? pathname === base : pathname.startsWith(href)
            return (
              <Link
                key={item.href}
                href={href}
                className={`mb-0.5 flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-xs transition-colors ${
                  active ? "bg-surface text-text" : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <item.icon size={13} style={{ color: active ? item.color : undefined }} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <section className="min-w-0 flex-1 px-8 py-7">{children}</section>
    </div>
  )
}
