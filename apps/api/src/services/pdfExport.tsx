import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@frame/db"
import { CallSheetDocument } from "./pdf/CallSheet.js"
import { ShotListDocument } from "./pdf/ShotList.js"
import { toCsv } from "./csv.js"
import { richTextToPlain } from "./richtext.js"

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
