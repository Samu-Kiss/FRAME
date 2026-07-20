import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@frame/db"
import { CallSheetDocument } from "./pdf/CallSheet.js"
import { ShotListDocument } from "./pdf/ShotList.js"
import { ScriptDocument, scriptDocToBlocks } from "./pdf/Script.js"
import { ProductionScheduleDocument } from "./pdf/ProductionSchedule.js"
import { SceneBreakdownDocument } from "./pdf/SceneBreakdown.js"
import { TalentScheduleDocument } from "./pdf/TalentSchedule.js"
import { SimpleListDocument } from "./pdf/SimpleList.js"
import { StripboardDocument } from "./pdf/Stripboard.js"
import { toCsv } from "./csv.js"
import { richTextToPlain } from "./richtext.js"

const enumLabel = (v: string) =>
  v.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

export interface ExportFile {
  filename: string
  contentType: string
  body: Buffer
}

// Synchronous render path for the core MVP. This module is the seam
// where the BullMQ worker plugs in later (§2.14): the worker calls the
// same generate* functions, only the transport changes.

export async function generateCallSheet(projectId: string, productionDayId: string): Promise<ExportFile> {
  const day = await prisma.productionDay.findUnique({
    where: { id: productionDayId },
    include: {
      project: { select: { title: true, client: true, type: true } },
      locations: { include: { location: true } },
      scheduleBlocks: {
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
        include: {
          location: { select: { id: true, name: true } },
          shots: { include: { shot: { select: { shotNumber: true, shotName: true } } } },
        },
      },
      crewCalls: { orderBy: { callTime: "asc" }, include: { person: { select: { name: true, role: true } } } },
      talentCalls: { orderBy: { callTime: "asc" }, include: { person: { select: { name: true, role: true } } } },
    },
  })
  if (!day || day.projectId !== projectId) throw new Error("ENTITY_NOT_FOUND:productionDay")

  const buffer = await renderToBuffer(
    <CallSheetDocument
      project={day.project}
      day={{
        date: day.date,
        generalCallTime: day.generalCallTime,
        status: day.status,
        generalNotes: day.generalNotes,
        locations: day.locations,
        scheduleBlocks: day.scheduleBlocks,
        crewCalls: day.crewCalls,
        talentCalls: day.talentCalls as never,
      }}
    />
  )
  const dateStr = day.date.toISOString().slice(0, 10)
  return { filename: `call-sheet-${dateStr}.pdf`, contentType: "application/pdf", body: buffer }
}

async function loadShotListTree(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { title: true, client: true },
  })
  const acts = await prisma.act.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { number: "asc" }],
    include: {
      scenes: {
        orderBy: { order: "asc" },
        include: {
          location: { select: { name: true } },
          shots: {
            orderBy: { order: "asc" },
            include: {
              people: { include: { person: { select: { name: true } } } },
              equipment: { include: { equipment: { select: { name: true } } } },
              props: { include: { prop: { select: { name: true } } } },
            },
          },
        },
      },
    },
  })
  return { project, acts }
}

export async function generateShotListPdf(projectId: string): Promise<ExportFile> {
  const { project, acts } = await loadShotListTree(projectId)
  const buffer = await renderToBuffer(<ShotListDocument project={project} acts={acts} />)
  return { filename: "shot-list.pdf", contentType: "application/pdf", body: buffer }
}

export async function generateScriptPdf(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { title: true, script: { select: { content: true } } },
  })
  const blocks = scriptDocToBlocks(project.script?.content)
  const buffer = await renderToBuffer(<ScriptDocument title={project.title} blocks={blocks} />)
  return { filename: "script.pdf", contentType: "application/pdf", body: buffer }
}

export async function generateProductionSchedule(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { title: true, client: true },
  })
  const days = await prisma.productionDay.findMany({
    where: { projectId },
    orderBy: { date: "asc" },
    include: {
      locations: { include: { location: { select: { name: true } } } },
      scheduleBlocks: {
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
        include: {
          location: { select: { name: true } },
          shots: { include: { shot: { select: { shotNumber: true } } } },
        },
      },
    },
  })
  const buffer = await renderToBuffer(<ProductionScheduleDocument project={project} days={days} />)
  return { filename: "production-schedule.pdf", contentType: "application/pdf", body: buffer }
}

export async function generateShotListCsv(projectId: string): Promise<ExportFile> {
  const { acts } = await loadShotListTree(projectId)
  const rows: unknown[][] = []
  for (const act of acts) {
    for (const scene of act.scenes) {
      for (const shot of scene.shots) {
        rows.push([
          act.number,
          scene.number,
          scene.title,
          scene.location?.name ?? "",
          shot.shotNumber,
          shot.shotName,
          richTextToPlain(shot.description),
          shot.frameSize ?? "",
          shot.lensSize ?? "",
          shot.cameraMovements.join(" + "),
          shot.cameraAngle ?? "",
          shot.people.map((p) => p.person.name).join("; "),
          shot.props.map((p) => p.prop.name).join("; "),
          shot.equipment.map((e) => e.equipment.name).join("; "),
          shot.estimatedDuration ?? "",
          shot.status,
          shot.filmed ? "yes" : "no",
          shot.takes ?? "",
          shot.selectedTake ?? "",
        ])
      }
    }
  }
  const csv = toCsv(
    [
      "Act", "Scene", "Scene Title", "Location", "Shot #", "Shot Name", "Description",
      "Frame Size", "Lens", "Movement", "Angle", "People", "Props", "Equipment",
      "Est. Duration (s)", "Status", "Filmed", "Takes", "Selected Take",
    ],
    rows
  )
  return { filename: "shot-list.csv", contentType: "text/csv; charset=utf-8", body: Buffer.from(csv, "utf-8") }
}

// ── MVP+ additional exports (§1.6) ─────────────────────────────

export async function generateSceneBreakdown(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true, client: true } })
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: [{ act: { number: "asc" } }, { order: "asc" }],
    include: {
      location: { select: { name: true } },
      stylings: { select: { lookName: true, character: { select: { name: true } } } },
      sceneProps: { include: { prop: { select: { name: true } } } },
      shots: {
        include: {
          people: { include: { person: { select: { name: true } } } },
          equipment: { include: { equipment: { select: { name: true } } } },
        },
      },
    },
  })
  const data = scenes.map((s) => {
    const cast = new Set<string>()
    const equipment = new Set<string>()
    s.shots.forEach((sh) => {
      sh.people.forEach((p) => cast.add(p.person.name))
      sh.equipment.forEach((e) => equipment.add(e.equipment.name))
    })
    return {
      number: s.number,
      title: s.title,
      daylight: enumLabel(s.daylight),
      location: s.location,
      cast: [...cast],
      props: s.sceneProps.map((sp) => sp.prop.name),
      styling: s.stylings.map((st) => `${st.lookName} (${st.character.name})`),
      equipment: [...equipment],
    }
  })
  const buffer = await renderToBuffer(<SceneBreakdownDocument project={project} scenes={data} />)
  return { filename: "scene-breakdown.pdf", contentType: "application/pdf", body: buffer }
}

export async function generateTalentSchedule(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true, client: true } })
  const talents = await prisma.person.findMany({
    where: { projectId, type: "TALENT" },
    orderBy: { name: "asc" },
    include: {
      talent: { select: { characterName: true } },
      talentCalls: {
        orderBy: { productionDay: { date: "asc" } },
        include: { productionDay: { select: { date: true } } },
      },
    },
  })
  const data = talents.map((t) => ({
    name: t.name,
    characterName: t.talent?.characterName ?? null,
    calls: t.talentCalls.map((c) => ({
      date: c.productionDay.date,
      callTime: c.callTime,
      makeupCallTime: c.makeupCallTime,
      onSetTime: c.onSetTime,
      wrapTime: c.wrapTime,
    })),
  }))
  const buffer = await renderToBuffer(<TalentScheduleDocument project={project} talents={data} />)
  return { filename: "talent-schedule.pdf", contentType: "application/pdf", body: buffer }
}

async function loadPropsRows(projectId: string) {
  const props = await prisma.prop.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { sceneProps: { include: { scene: { select: { number: true } } } } },
  })
  return props.map((p) => [
    p.name,
    enumLabel(p.category),
    String(p.quantity),
    enumLabel(p.status),
    p.source ? enumLabel(p.source) : "",
    p.sourceName ?? "",
    p.cost != null ? `$${p.cost}` : "",
    p.sceneProps.map((sp) => sp.scene.number).join(", "),
  ])
}

export async function generatePropsListPdf(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true, client: true } })
  const rows = await loadPropsRows(projectId)
  const buffer = await renderToBuffer(
    <SimpleListDocument
      project={project}
      docTitle="Props List"
      columns={[
        { label: "Prop", width: "22%" }, { label: "Category", width: "13%" }, { label: "Qty", width: "6%" },
        { label: "Status", width: "13%" }, { label: "Source", width: "12%" }, { label: "Source Name", width: "14%" },
        { label: "Cost", width: "8%" }, { label: "Scenes", width: "12%" },
      ]}
      rows={rows}
    />
  )
  return { filename: "props-list.pdf", contentType: "application/pdf", body: buffer }
}

export async function generatePropsListCsv(projectId: string): Promise<ExportFile> {
  const rows = await loadPropsRows(projectId)
  const csv = toCsv(["Prop", "Category", "Quantity", "Status", "Source", "Source Name", "Cost", "Scenes"], rows)
  return { filename: "props-list.csv", contentType: "text/csv; charset=utf-8", body: Buffer.from(csv, "utf-8") }
}

async function loadEquipmentRows(projectId: string) {
  const equipment = await prisma.equipment.findMany({
    where: { projectId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { assignedTo: { include: { crew: { include: { person: { select: { name: true } } } } } } },
  })
  return equipment.map((e) => [
    e.name,
    enumLabel(e.type),
    e.brand ?? "",
    e.model ?? "",
    e.serialNumber ?? "",
    e.rentalSource ?? "",
    e.assignedTo.map((a) => a.crew.person.name).join(", "),
  ])
}

export async function generateEquipmentListPdf(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true, client: true } })
  const rows = await loadEquipmentRows(projectId)
  const buffer = await renderToBuffer(
    <SimpleListDocument
      project={project}
      docTitle="Equipment List"
      columns={[
        { label: "Equipment", width: "22%" }, { label: "Type", width: "13%" }, { label: "Brand", width: "13%" },
        { label: "Model", width: "15%" }, { label: "Serial", width: "12%" }, { label: "Rental", width: "13%" },
        { label: "Assigned", width: "12%" },
      ]}
      rows={rows}
    />
  )
  return { filename: "equipment-list.pdf", contentType: "application/pdf", body: buffer }
}

export async function generateEquipmentListCsv(projectId: string): Promise<ExportFile> {
  const rows = await loadEquipmentRows(projectId)
  const csv = toCsv(["Equipment", "Type", "Brand", "Model", "Serial", "Rental Source", "Assigned To"], rows)
  return { filename: "equipment-list.csv", contentType: "text/csv; charset=utf-8", body: Buffer.from(csv, "utf-8") }
}

export async function generateStripboard(projectId: string): Promise<ExportFile> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { title: true, client: true } })

  const days = await prisma.productionDay.findMany({
    where: { projectId },
    orderBy: { date: "asc" },
    include: {
      scheduleBlocks: { include: { shots: { include: { shot: { select: { sceneId: true } } } } } },
    },
  })
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: [{ act: { number: "asc" } }, { order: "asc" }],
    include: {
      location: { select: { name: true } },
      shots: { include: { people: { select: { personId: true } } } },
    },
  })

  const stripFor = (s: (typeof scenes)[number]) => {
    const cast = new Set<string>()
    let seconds = 0
    s.shots.forEach((sh) => {
      sh.people.forEach((p) => cast.add(p.personId))
      seconds += sh.estimatedDuration ?? 0
    })
    // rough eighths-of-a-page from estimated screen time
    const eighths = Math.max(1, Math.round((seconds || (s.estimatedDuration ?? 1) * 60) / 20))
    return {
      sceneNumber: s.number,
      title: s.title,
      daylight: s.daylight,
      location: s.location?.name ?? "—",
      cast: cast.size,
      pages: `${Math.floor(eighths / 8)} ${eighths % 8}/8`,
    }
  }

  // scene → shoot day, via which day's blocks schedule that scene's shots
  const sceneToDay = new Map<string, string>()
  const sceneByShotSceneId = new Map<string, string>() // sceneId → sceneId (identity, kept for clarity)
  scenes.forEach((s) => sceneByShotSceneId.set(s.id, s.id))
  for (const day of days) {
    for (const block of day.scheduleBlocks) {
      for (const bs of block.shots) {
        const sceneId = bs.shot.sceneId
        if (sceneByShotSceneId.has(sceneId) && !sceneToDay.has(sceneId)) sceneToDay.set(sceneId, day.id)
      }
    }
  }

  const dayGroups: { date: Date | null; label: string; strips: ReturnType<typeof stripFor>[] }[] = days.map((day, i) => ({
    date: day.date,
    label: `Day ${i + 1}`,
    strips: scenes.filter((s) => sceneToDay.get(s.id) === day.id).map(stripFor),
  }))
  const scheduledIds = new Set([...sceneToDay.keys()])
  const unscheduled = scenes.filter((s) => !scheduledIds.has(s.id))
  if (unscheduled.length) {
    dayGroups.push({ date: null, label: "Unscheduled", strips: unscheduled.map(stripFor) })
  }

  const buffer = await renderToBuffer(<StripboardDocument project={project} days={dayGroups} />)
  return { filename: "stripboard.pdf", contentType: "application/pdf", body: buffer }
}
