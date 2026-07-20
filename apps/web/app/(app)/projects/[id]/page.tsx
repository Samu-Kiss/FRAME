"use client"

import { use } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Card, SectionLabel, Spinner, Avatar, MonoChip } from "@/components/ui"
import { useI18n } from "@/lib/i18n"
import { SMPTE, enumLabel } from "@/lib/theme"

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <Card className="flex-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold" style={{ color: accent }}>
        {value}
      </p>
    </Card>
  )
}

const ACTION_COLOR: Record<string, string> = {
  CREATED: SMPTE.green,
  UPDATED: SMPTE.yellow,
  DELETED: SMPTE.red,
  RESTORED: SMPTE.cyan,
}

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const dash = trpc.project.dashboard.useQuery({ projectId: id })
  const { t } = useI18n()

  if (dash.isLoading || !dash.data) return <Spinner />
  const d = dash.data
  const pct = d.totalShots ? Math.round((d.filmedShots / d.totalShots) * 100) : 0
  const daysToNext = d.nextDay
    ? Math.ceil((new Date(d.nextDay.date).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display mb-6 text-lg font-bold uppercase tracking-[0.15em]">{t("nav.dashboard")}</h1>

      <div className="mb-8 flex flex-col gap-4 md:flex-row">
        <Stat label={t("dash.shotsFilmed")} value={`${pct}%`} accent={SMPTE.green} />
        <Stat label={t("dash.totalShots")} value={d.totalShots} accent={SMPTE.blue} />
        <Stat label={t("dash.scenes")} value={d.scenes} accent={SMPTE.cyan} />
        <Stat label={t("dash.openTasks")} value={d.pendingTasks} accent={d.urgentTasks ? SMPTE.red : SMPTE.yellow} />
        <Stat
          label={t("dash.nextDay")}
          value={daysToNext === null ? "—" : daysToNext <= 0 ? "Today" : `${daysToNext}d`}
          accent={SMPTE.white}
        />
      </div>

      <SectionLabel label={t("dash.recentActivity")} color={SMPTE.green} />
      <Card>
        {d.recentChanges.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border-dim">
            {d.recentChanges.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={c.user?.name ?? "System"} />
                <span className="min-w-0 flex-1 truncate text-xs">
                  <span className="text-text">{c.user?.name ?? "System"}</span>{" "}
                  <span style={{ color: ACTION_COLOR[c.action] }}>{c.action.toLowerCase()}</span>{" "}
                  <span className="text-muted">{enumLabel(c.entityType)}</span>
                  {c.namedVersion ? <MonoChip color={SMPTE.white}> {c.namedVersion}</MonoChip> : null}
                </span>
                <span className="font-mono shrink-0 text-[10px] text-faint">
                  {new Date(c.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-right">
          <Link href={`/projects/${id}/changelog`} className="text-[11px] text-smpte-cyan hover:underline">
            Full changelog →
          </Link>
        </div>
      </Card>
    </div>
  )
}
