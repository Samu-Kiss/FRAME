"use client"

import { X } from "lucide-react"
import { SMPTE, SMPTE_LIST, type StatusStyle } from "@/lib/theme"

/* ── SMPTE atoms (ported from the design mockups) ─────────────── */

export const SmpteBar = ({ h = 4 }: { h?: number }) => (
  <div style={{ display: "flex", height: h, width: "100%", flexShrink: 0 }}>
    {SMPTE_LIST.map((c, i) => (
      <div key={i} style={{ flex: 1, background: c }} />
    ))}
  </div>
)

export const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: { dot: 4, gap: 2, br: 10, word: 20, sub: 8, subTrack: "0.26em", subMt: 4 },
    md: { dot: 6, gap: 3, br: 14, word: 30, sub: 10, subTrack: "0.28em", subMt: 5 },
    lg: { dot: 7, gap: 3.5, br: 18, word: 44, sub: 11, subTrack: "0.30em", subMt: 7 },
  }
  const s = sizes[size]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.br }}>
      <div
        style={{
          display: "flex", flexDirection: "column", gap: s.gap, paddingRight: s.br,
          borderRight: "1px solid #1E1E1E", flexShrink: 0,
        }}
      >
        {SMPTE_LIST.map((c, i) => (
          <div key={i} style={{ width: s.dot, height: s.dot, borderRadius: "50%", background: c, opacity: 0.85 }} />
        ))}
      </div>
      <div>
        <span
          className="font-display"
          style={{ fontWeight: 700, fontSize: s.word, letterSpacing: "0.28em", color: "#F0F0F0", lineHeight: 1, display: "block" }}
        >
          FRAME
        </span>
        <div
          className="font-display"
          style={{ fontWeight: 400, fontSize: s.sub, letterSpacing: s.subTrack, color: "#4A4A4A", textTransform: "uppercase", marginTop: s.subMt }}
        >
          Production Management
        </div>
      </div>
    </div>
  )
}

export const StatusBadge = ({ status, size = "sm" }: { status: StatusStyle | undefined; size?: "sm" | "md" }) => {
  if (!status) return null
  return (
    <span
      className="font-display inline-flex items-center whitespace-nowrap uppercase"
      style={{
        gap: 5,
        padding: size === "sm" ? "2px 8px" : "3px 11px",
        borderRadius: 3,
        background: status.color + "14",
        border: `1px solid ${status.color}33`,
        color: status.color,
        fontWeight: 600,
        fontSize: size === "sm" ? 9 : 11,
        letterSpacing: "0.08em",
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: status.color, flexShrink: 0 }} />
      {status.label}
    </span>
  )
}

export const MonoChip = ({ children, color = SMPTE.cyan }: { children: React.ReactNode; color?: string }) => (
  <span
    className="font-mono whitespace-nowrap"
    style={{
      fontSize: 10, color, background: color + "10", border: `1px solid ${color}28`,
      padding: "2px 7px", borderRadius: 2, letterSpacing: "0.03em",
    }}
  >
    {children}
  </span>
)

export const Avatar = ({ name, size = 20 }: { name: string; size?: number }) => {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("")
  const cols = [SMPTE.cyan, SMPTE.yellow, SMPTE.magenta, SMPTE.green, SMPTE.blue]
  const col = cols[name.charCodeAt(0) % cols.length]!
  return (
    <span
      title={name}
      className="font-mono inline-flex items-center justify-center rounded-full"
      style={{
        width: size, height: size, fontSize: size * 0.38, flexShrink: 0,
        background: col + "18", border: `1px solid ${col}40`, color: col,
      }}
    >
      {initials}
    </span>
  )
}

export const SectionLabel = ({ label, color = SMPTE.cyan }: { label: string; color?: string }) => (
  <div className="mb-3 flex items-center gap-2">
    <div style={{ width: 3, height: 13, background: color, borderRadius: 1 }} />
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
  </div>
)

/* ── Generic controls ─────────────────────────────────────────── */

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-text text-bg hover:bg-white border border-transparent",
    ghost: "bg-transparent text-text border border-border hover:border-muted",
    danger: "bg-transparent text-smpte-red border border-smpte-red/40 hover:bg-smpte-red/10",
  }
  return (
    <button
      className={`font-display cursor-pointer rounded-[3px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

const fieldClass =
  "w-full rounded-[3px] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-faint focus:border-smpte-cyan/60 focus:outline-none"

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} min-h-20 ${props.className ?? ""}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-muted">{label}</span>
      {children}
    </label>
  )
}

/* ── Layout blocks ────────────────────────────────────────────── */

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border bg-surface p-5 ${className}`}>{children}</div>
}

export function Modal({
  title,
  open,
  onClose,
  children,
  wide = false,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6" onClick={onClose}>
      <div
        className={`mt-10 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-md border border-border bg-surface shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <SmpteBar h={3} />
        <div className="flex items-center justify-between border-b border-border-dim px-5 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em]">{title}</h2>
          <button onClick={onClose} className="cursor-pointer text-muted hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-center">
      <p className="font-display text-sm font-semibold text-muted">{title}</p>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-1.5">
        {SMPTE_LIST.map((c, i) => (
          <span
            key={i}
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ background: c, animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-[3px] border border-smpte-red/40 bg-smpte-red/10 px-3 py-2 text-xs text-smpte-red">
      {message}
    </p>
  )
}
