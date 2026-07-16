import { prisma } from "@frame/db"

// SlateConfig resolver (§4.11): auto fields pull from the linked data,
// manual fields echo what the user typed. Pure data — the PDF/PNG/preview
// renderers all consume the same resolved list.

export type SlateFieldKey =
  | "production" | "director" | "dop" | "date" | "scene" | "shot" | "take"
  | "roll" | "camera" | "lens" | "filter" | "fps" | "format" | "custom"

export interface SlateFieldConfig {
  fieldKey: SlateFieldKey
  label: string
  valueSource: "auto" | "manual"
  autoRef?: string
  manualValue?: string
  enabled?: boolean
}

export interface SlateConfig {
  enabled: boolean
  layout: "standard" | "minimal" | "custom"
  fields: SlateFieldConfig[]
}

export interface ResolvedSlateField {
  fieldKey: string
  label: string
  value: string
  valueSource: "auto" | "manual"
  enabled: boolean
}

// Standard slate (§4.11 table) — the default when a shot has no config yet.
export const DEFAULT_SLATE_CONFIG: SlateConfig = {
  enabled: true,
  layout: "standard",
  fields: [
    { fieldKey: "production", label: "Production", valueSource: "auto", enabled: true },
    { fieldKey: "director", label: "Director", valueSource: "auto", enabled: true },
    { fieldKey: "dop", label: "D.O.P.", valueSource: "auto", enabled: true },
    { fieldKey: "date", label: "Date", valueSource: "auto", enabled: true },
    { fieldKey: "scene", label: "Scene", valueSource: "auto", enabled: true },
    { fieldKey: "shot", label: "Shot", valueSource: "auto", enabled: true },
    { fieldKey: "take", label: "Take", valueSource: "auto", enabled: true },
    { fieldKey: "roll", label: "Roll", valueSource: "manual", manualValue: "A001", enabled: true },
    { fieldKey: "camera", label: "Camera", valueSource: "auto", enabled: true },
    { fieldKey: "lens", label: "Lens", valueSource: "auto", enabled: true },
    { fieldKey: "fps", label: "FPS", valueSource: "manual", manualValue: "24", enabled: true },
    { fieldKey: "format", label: "Format", valueSource: "manual", manualValue: "UHD", enabled: false },
    { fieldKey: "filter", label: "Filter", valueSource: "manual", manualValue: "", enabled: false },
  ],
}

export async function resolveSlate(projectId: string, shotId: string) {
  const shot = await prisma.shot.findUniqueOrThrow({
    where: { id: shotId },
    include: {
      scene: { select: { number: true, projectId: true } },
      equipment: { include: { equipment: { select: { name: true, type: true } } } },
    },
  })
  if (shot.projectId !== projectId) throw new Error("ENTITY_NOT_FOUND:shot")

  const [project, persons, nextDay] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true } }),
    prisma.person.findMany({
      where: { projectId, department: { in: ["DIRECTION", "PHOTOGRAPHY"] } },
      select: { name: true, role: true, department: true },
    }),
    prisma.productionDay.findFirst({
      where: { projectId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ])

  const director = persons.find((p) => p.department === "DIRECTION" && /director\b/i.test(p.role) && !/asist|assist/i.test(p.role))
  const dop = persons.find((p) => p.department === "PHOTOGRAPHY" && /(fotograf|photo|d\.?o\.?p|dp\b)/i.test(p.role))
  const camera = shot.equipment.map((e) => e.equipment).find((e) => e.type === "CAMERA")
  const slateDate = (nextDay?.date ?? new Date()).toISOString().slice(0, 10)

  const AUTO_VALUES: Record<string, string> = {
    production: project.title,
    director: director?.name ?? "—",
    dop: dop?.name ?? "—",
    date: slateDate,
    scene: shot.scene.number,
    shot: shot.shotNumber,
    take: String((shot.takes ?? 0) + 1),
    camera: camera?.name ?? "—",
    lens: shot.lensSize ?? "—",
  }

  const stored = (shot.slateConfig as SlateConfig | null) ?? null
  const config: SlateConfig = stored?.fields?.length ? { ...DEFAULT_SLATE_CONFIG, ...stored } : DEFAULT_SLATE_CONFIG

  const fields: ResolvedSlateField[] = config.fields.map((f) => ({
    fieldKey: f.fieldKey,
    label: f.label,
    valueSource: f.valueSource,
    enabled: f.enabled ?? true,
    value:
      f.valueSource === "manual"
        ? (f.manualValue ?? "")
        : (AUTO_VALUES[f.autoRef ?? f.fieldKey] ?? AUTO_VALUES[f.fieldKey] ?? "—"),
  }))

  return { config, fields, shotNumber: shot.shotNumber, projectTitle: project.title }
}
