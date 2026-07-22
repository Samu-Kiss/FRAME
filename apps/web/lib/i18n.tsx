"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { trpc } from "@/lib/trpc"

export type Lang = "EN" | "ES"

// Flat key → { EN, ES } dictionary. Keys are dot-namespaced by area.
// Only chrome/navigation and shared labels are translated for the MVP+
// pass; domain data (shot descriptions, names) stays as entered.
const DICT: Record<string, { EN: string; ES: string }> = {
  // nav
  "nav.dashboard": { EN: "Dashboard", ES: "Panel" },
  "nav.script": { EN: "Script", ES: "Guión" },
  "nav.shotlist": { EN: "Shotlist", ES: "Shotlist" },
  "nav.moodboard": { EN: "Moodboard", ES: "Moodboard" },
  "nav.people": { EN: "People & Tasks", ES: "Personas y Tareas" },
  "nav.locations": { EN: "Locations", ES: "Locaciones" },
  "nav.props": { EN: "Props", ES: "Utilería" },
  "nav.styling": { EN: "Styling", ES: "Vestuario" },
  "nav.equipment": { EN: "Equipment", ES: "Equipo" },
  "nav.schedule": { EN: "Production Days", ES: "Días de Rodaje" },
  "nav.budget": { EN: "Budget", ES: "Presupuesto" },
  "nav.exports": { EN: "Exports", ES: "Exportaciones" },
  "nav.changelog": { EN: "Changelog", ES: "Historial" },
  "nav.settings": { EN: "Team & Settings", ES: "Equipo y Ajustes" },
  // common
  "common.signOut": { EN: "Sign out", ES: "Cerrar sesión" },
  "common.notifications": { EN: "Notifications", ES: "Notificaciones" },
  "common.markAllRead": { EN: "Mark all read", ES: "Marcar todo leído" },
  "common.caughtUp": { EN: "You're all caught up.", ES: "Estás al día." },
  "common.newProject": { EN: "New project", ES: "Nuevo proyecto" },
  "common.projects": { EN: "Projects", ES: "Proyectos" },
  "common.create": { EN: "Create", ES: "Crear" },
  "common.cancel": { EN: "Cancel", ES: "Cancelar" },
  "common.save": { EN: "Save", ES: "Guardar" },
  "common.delete": { EN: "Delete", ES: "Eliminar" },
  "common.language": { EN: "Language", ES: "Idioma" },
  // dashboard
  "dash.shotsFilmed": { EN: "Shots filmed", ES: "Shots filmados" },
  "dash.totalShots": { EN: "Total shots", ES: "Shots totales" },
  "dash.scenes": { EN: "Scenes", ES: "Escenas" },
  "dash.openTasks": { EN: "Open tasks", ES: "Tareas abiertas" },
  "dash.nextDay": { EN: "Next shoot day", ES: "Próximo día" },
  "dash.recentActivity": { EN: "Recent activity", ES: "Actividad reciente" },
  // comments
  "comments.discussion": { EN: "Discussion", ES: "Discusión" },
  "comments.placeholder": { EN: "Add a comment… @name to mention", ES: "Añade un comentario… @nombre para mencionar" },
  "comments.empty": { EN: "No comments yet. Use @name to mention someone.", ES: "Sin comentarios. Usa @nombre para mencionar." },
}

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: keyof typeof DICT | string) => string
}

const Ctx = createContext<I18nCtx>({ lang: "EN", setLang: () => {}, t: (k) => String(k) })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("EN")
  const me = trpc.me.useQuery()
  const setLanguage = trpc.setLanguage.useMutation()

  // hydrate from localStorage first (instant), then reconcile with the server
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (window.localStorage.getItem("frame-lang") as Lang | null) : null
    if (stored === "EN" || stored === "ES") setLangState(stored)
  }, [])
  useEffect(() => {
    if (me.data?.language && me.data.language !== lang && !window.localStorage.getItem("frame-lang")) {
      setLangState(me.data.language as Lang)
    }
  }, [me.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = (l: Lang) => {
    setLangState(l)
    window.localStorage.setItem("frame-lang", l)
    setLanguage.mutate({ language: l })
  }

  const t = (key: string) => DICT[key]?.[lang] ?? DICT[key]?.EN ?? key

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  return useContext(Ctx)
}
