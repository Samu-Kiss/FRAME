"use client"

import { useEffect, useState } from "react"
import { X, ArrowRight } from "lucide-react"
import { SmpteBar } from "@/components/ui"
import { SMPTE } from "@/lib/theme"

// Lightweight guided tour (v2.0 §1.10). Highlights nav modules with
// coach-marks; "seen" state persists in localStorage so it shows once,
// with a manual relaunch entry point.

interface Step {
  selector: string // data-tour attribute value
  title: string
  body: string
}

const STEPS: Step[] = [
  { selector: "nav-dashboard", title: "Dashboard", body: "Your production at a glance — % filmed, open tasks and a live activity feed." },
  { selector: "nav-script", title: "Script", body: "Write your screenplay in industry format. Auto-breakdown turns it into draft scenes." },
  { selector: "nav-shotlist", title: "Shotlist", body: "The heart of FRAME. Every shot with frame, lens, talent, props and status — edit inline." },
  { selector: "nav-people", title: "People & Tasks", body: "Talent, crew and clients, each with a personal task board. Mention teammates in comments." },
  { selector: "nav-budget", title: "Budget", body: "Track estimated vs actual cost per category, with variance and CSV export." },
  { selector: "nav-schedule", title: "Production Days", body: "Build call sheets visually with parallel schedule blocks, then export them." },
  { selector: "nav-exports", title: "Exports", body: "Call sheets, shot lists, breakdowns, stripboards — one click to a professional PDF." },
]

const STORAGE_KEY = "frame-tour-seen"

export function useTour() {
  const [active, setActive] = useState(false)
  const start = () => setActive(true)
  const stop = () => {
    setActive(false)
    try { window.localStorage.setItem(STORAGE_KEY, "1") } catch {}
  }
  return { active, start, stop }
}

export function hasSeenTour(): boolean {
  try { return window.localStorage.getItem(STORAGE_KEY) === "1" } catch { return true }
}

export function Tour({ active, onClose }: { active: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!active) return
    setStep(0)
  }, [active])

  useEffect(() => {
    if (!active) return
    const current = STEPS[step]
    if (!current) return
    const el = document.querySelector(`[data-tour="${current.selector}"]`)
    if (el) {
      el.scrollIntoView({ block: "nearest" })
      setRect(el.getBoundingClientRect())
    } else {
      setRect(null)
    }
  }, [active, step])

  if (!active) return null
  const current = STEPS[step]
  if (!current) return null
  const isLast = step === STEPS.length - 1

  // position the card next to the highlighted nav item (sidebar is on the left)
  const cardStyle: React.CSSProperties = rect
    ? { position: "fixed", top: Math.min(rect.top, window.innerHeight - 220), left: rect.right + 16, zIndex: 1000, width: 300 }
    : { position: "fixed", top: 120, left: 240, zIndex: 1000, width: 300 }

  return (
    <>
      {/* dim overlay with a cut-out ring around the target */}
      <div className="fixed inset-0 z-[999] bg-black/60" onClick={onClose} />
      {rect ? (
        <div
          className="pointer-events-none fixed z-[1000] rounded-[4px]"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: `0 0 0 2px ${SMPTE.cyan}, 0 0 0 9999px rgba(0,0,0,0.6)`,
          }}
        />
      ) : null}

      <div style={cardStyle} className="overflow-hidden rounded-md border border-border bg-surface shadow-2xl">
        <SmpteBar h={3} />
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              {step + 1} / {STEPS.length}
            </span>
            <button className="cursor-pointer text-muted hover:text-text" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
          <h3 className="font-display mb-1.5 text-sm font-bold">{current.title}</h3>
          <p className="mb-4 text-[11px] leading-relaxed text-muted">{current.body}</p>
          <div className="flex items-center justify-between">
            <button
              className="font-mono cursor-pointer text-[10px] uppercase tracking-wider text-faint hover:text-text"
              onClick={onClose}
            >
              Skip
            </button>
            <button
              className="font-display flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-text px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-bg"
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            >
              {isLast ? "Finish" : "Next"} {!isLast ? <ArrowRight size={11} /> : null}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
