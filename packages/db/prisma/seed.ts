/**
 * FRAME demo seed.
 *
 * Creates the demo auth user in Supabase (local or cloud, depending on env),
 * then a demo commercial project showcasing the core modules — the same
 * fictional production used in the design mockups.
 *
 * Re-runnable: drops any previous demo_template project first.
 * Login: demo@frame.app / frame-demo-1234
 */
import { createClient } from "@supabase/supabase-js"
import { prisma } from "../src/index.js"

const DEMO_EMAIL = "demo@frame.app"
const DEMO_PASSWORD = "frame-demo-1234"

async function ensureDemoAuthUser(): Promise<string> {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — run `supabase start` and fill packages/db/.env")
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Demo Director" },
  })
  if (created?.user) return created.user.id

  // Already exists — look it up
  if (error) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existing = list.users.find((u) => u.email === DEMO_EMAIL)
    if (existing) return existing.id
    throw error
  }
  throw new Error("Could not create or find demo auth user")
}

const ADMIN_PERMISSIONS = {
  canEditScript: true,
  canEditShotlist: true,
  canEditCameraData: true,
  canEditSchedule: true,
  canEditPeople: true,
  canEditLocations: true,
  canEditStyling: true,
  canEditProps: true,
  canExport: true,
  canManageMembers: true,
  isAdmin: true,
}

function rt(text: string) {
  // Minimal TipTap-compatible rich text doc
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }
}

async function main() {
  const userId = await ensureDemoAuthUser()
  console.log(`Demo auth user: ${DEMO_EMAIL} (${userId})`)

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: DEMO_EMAIL, name: "Demo Director", plan: "PRO" },
  })

  // Drop previous demo project (cascades to all children)
  await prisma.project.deleteMany({ where: { creationSource: "demo_template", ownerId: userId } })

  const project = await prisma.project.create({
    data: {
      title: "AFTERGLOW — Fragrance Launch",
      type: "COMMERCIAL",
      client: "Maison Lumen",
      brand: "Afterglow Eau de Parfum",
      description: rt(
        "60s hero commercial. A night-to-dawn story on a city rooftop: María receives a message that changes everything. Moody, cinematic, SMPTE-clean."
      ),
      status: "PRE_PRODUCTION",
      shootDates: [{ start: "2026-08-03", end: "2026-08-05" }],
      creationSource: "demo_template",
      ownerId: userId,
      members: {
        create: {
          userId,
          projectRole: "Director / Producer",
          permissions: ADMIN_PERMISSIONS,
          isAdmin: true,
        },
      },
    },
  })
  const pid = project.id

  // ── Locations ────────────────────────────────────────────────
  const rooftop = await prisma.location.create({
    data: {
      projectId: pid,
      name: "Skyline Rooftop — Torre Colpatria",
      type: "EXTERIOR",
      address: "Cra 7 #24-89, Bogotá",
      coordinates: { lat: 4.6097, lng: -74.0703 },
      contactName: "Jorge Peña",
      contactPhone: "+57 310 555 0134",
      permitRequired: true,
      permitStatus: "IN_PROCESS",
      scoutingNotes: rt("Golden hour hits the west edge at 17:40. Wind picks up after 20:00 — flags needed."),
      accessNotes: rt("Freight elevator only until 18:00. Load-in via parking level B2."),
      powerAvailable: true,
      amenities: ["freight elevator", "green room", "restrooms"],
    },
  })
  const elevator = await prisma.location.create({
    data: {
      projectId: pid,
      name: "Elevator Interior — Studio Set",
      type: "STUDIO",
      address: "Estudios Nacional, Stage 3",
      permitRequired: false,
      permitStatus: "NOT_REQUIRED",
      powerAvailable: true,
      scoutingNotes: rt("Practical LED panel behind diffusion. Mirror walls need flagging for reflections."),
      amenities: ["stage power", "catering area", "makeup room"],
    },
  })
  const city = await prisma.location.create({
    data: {
      projectId: pid,
      name: "City Aerial — Downtown Corridor",
      type: "URBAN",
      permitRequired: true,
      permitStatus: "PENDING",
      powerAvailable: false,
      scoutingNotes: rt("Drone corridor approved 06:00–08:00 and 17:00–19:00 only. Backup: helipad POV."),
      amenities: [],
    },
  })

  // ── People ───────────────────────────────────────────────────
  const director = await prisma.person.create({
    data: {
      projectId: pid, userId, name: "Demo Director", email: DEMO_EMAIL,
      department: "DIRECTION", role: "Director", type: "CREW", callTime: "06:00",
      crew: { create: { crewType: "HEAD_OF_DEPARTMENT" } },
    },
  })
  const producer = await prisma.person.create({
    data: {
      projectId: pid, name: "Lucía Fernández", email: "lucia@lumenfilms.co", phone: "+57 315 555 0192",
      department: "PRODUCTION", role: "Producer", type: "CREW", callTime: "06:00",
      crew: { create: { crewType: "HEAD_OF_DEPARTMENT", vehicle: "Van 1" } },
    },
  })
  const dop = await prisma.person.create({
    data: {
      projectId: pid, name: "Bruno Torres", email: "bruno.t@frame.app",
      department: "PHOTOGRAPHY", role: "Director de Fotografía", type: "CREW", callTime: "06:00",
      crew: { create: { crewType: "HEAD_OF_DEPARTMENT" } },
    },
  })
  const firstAd = await prisma.person.create({
    data: {
      projectId: pid, name: "Sara Kim", phone: "+57 300 555 0177",
      department: "DIRECTION", role: "1st AD", type: "CREW", callTime: "05:45",
      crew: { create: { crewType: "ASSISTANT" } },
    },
  })
  const gaffer = await prisma.person.create({
    data: {
      projectId: pid, name: "Andrés Rojas",
      department: "PHOTOGRAPHY", role: "Gaffer", type: "CREW", callTime: "06:00",
      crew: { create: { crewType: "OPERATOR", vehicle: "Grip truck" } },
    },
  })
  const stylist = await prisma.person.create({
    data: {
      projectId: pid, name: "Valentina Ruiz",
      department: "WARDROBE", role: "Stylist", type: "CREW", callTime: "06:30",
      crew: { create: { crewType: "HEAD_OF_DEPARTMENT" } },
    },
  })
  const maria = await prisma.person.create({
    data: {
      projectId: pid, name: "María Vargas", email: "maria@agency.co",
      department: "TALENT", role: "Lead", type: "TALENT", callTime: "07:00",
      talent: {
        create: {
          characterName: "María",
          agencyName: "Blanco Models",
          agencyContact: "casting@blanco.co",
          measurements: { height: "172cm", sizes: { dress: "S", shoes: "38" } },
          portfolio: ["https://blanco.co/maria-vargas"],
        },
      },
    },
  })
  const carlos = await prisma.person.create({
    data: {
      projectId: pid, name: "Carlos Medina",
      department: "TALENT", role: "Supporting", type: "TALENT", callTime: "09:00",
      talent: { create: { characterName: "Carlos", agencyName: "Blanco Models" } },
    },
  })
  const editor = await prisma.person.create({
    data: {
      projectId: pid, name: "Pablo Serrano",
      department: "POST", role: "Editor", type: "POST_CREW",
      postCrew: { create: { deliverables: ["60s master", "30s cutdown", "9:16 social"], software: ["Premiere", "DaVinci"] } },
    },
  })
  const clientPerson = await prisma.person.create({
    data: {
      projectId: pid, name: "Isabelle Fontaine", email: "i.fontaine@maisonlumen.com",
      department: "CLIENT", role: "Brand Manager", type: "CLIENT",
      client: { create: { companyName: "Maison Lumen", position: "Global Brand Manager", approvalRequired: true } },
    },
  })

  // ── Equipment ────────────────────────────────────────────────
  const arri = await prisma.equipment.create({
    data: { projectId: pid, name: "ARRI Alexa LF", type: "CAMERA", brand: "ARRI", model: "Alexa LF", rentalSource: "CineRent Bogotá", assignedTo: { create: { crewId: dop.id } } },
  })
  const lens35 = await prisma.equipment.create({
    data: { projectId: pid, name: "Signature Prime 35mm", type: "LENS", brand: "ARRI", model: "Signature Prime", rentalSource: "CineRent Bogotá" },
  })
  const lens85 = await prisma.equipment.create({
    data: { projectId: pid, name: "Signature Prime 85mm", type: "LENS", brand: "ARRI", model: "Signature Prime", rentalSource: "CineRent Bogotá" },
  })
  const macro100 = await prisma.equipment.create({
    data: { projectId: pid, name: "Macro 100mm", type: "LENS", brand: "Zeiss", model: "CP.3 100mm Macro", rentalSource: "CineRent Bogotá" },
  })
  const drone = await prisma.equipment.create({
    data: { projectId: pid, name: "DJI Inspire 3", type: "DRONE", brand: "DJI", model: "Inspire 3", rentalSource: "AeroFilm", notes: "Licensed pilot included" },
  })
  const steadicam = await prisma.equipment.create({
    data: { projectId: pid, name: "Steadicam M-2", type: "STEADICAM", brand: "Tiffen", model: "M-2", assignedTo: { create: { crewId: gaffer.id } } },
  })

  // ── Props ────────────────────────────────────────────────────
  const phone = await prisma.prop.create({
    data: { projectId: pid, name: "Hero phone (screen playback)", category: "TECH", quantity: 2, status: "CONFIRMED", source: "OWN", notes: rt("Needs playback rig for message notification insert.") },
  })
  const bottle = await prisma.prop.create({
    data: { projectId: pid, name: "Afterglow bottle — hero", category: "PROP", quantity: 3, status: "IN_STORAGE", source: "BORROWED", sourceName: "Maison Lumen", cost: 0 },
  })
  const coat = await prisma.prop.create({
    data: { projectId: pid, name: "Vintage trench coat", category: "PROP", quantity: 1, status: "SEARCHING", source: "RENTED", sourceName: "Vestuario Central", cost: 180 },
  })

  // ── Structure: acts, scenes, shots ───────────────────────────
  const act1 = await prisma.act.create({ data: { projectId: pid, number: 1, title: "Night — The Message", order: 0 } })
  const act2 = await prisma.act.create({ data: { projectId: pid, number: 2, title: "Dawn — The Reveal", order: 1 } })

  const scene1A = await prisma.scene.create({
    data: {
      actId: act1.id, projectId: pid, number: "1A", title: "Rooftop — María alone",
      synopsis: rt("María stands at the edge of the rooftop at night. Her phone lights up with a message."),
      locationId: rooftop.id, daylight: "NIGHT", estimatedDuration: 4, status: "IN_PROGRESS", order: 0,
    },
  })
  const scene1B = await prisma.scene.create({
    data: {
      actId: act1.id, projectId: pid, number: "1B", title: "Elevator — the descent",
      synopsis: rt("Insert coverage inside the elevator. The unread message glows."),
      locationId: elevator.id, daylight: "NIGHT", estimatedDuration: 2, status: "NOT_FILMED", order: 1,
    },
  })
  const scene2A = await prisma.scene.create({
    data: {
      actId: act2.id, projectId: pid, number: "2A", title: "City aerial — dawn push-in",
      synopsis: rt("Aerial establishing at golden hour, slow push toward the tower."),
      locationId: city.id, daylight: "SUNSET", estimatedDuration: 2, status: "NOT_FILMED", order: 0,
    },
  })

  const shot1A01 = await prisma.shot.create({
    data: {
      sceneId: scene1A.id, projectId: pid, shotNumber: "1A-01", shotName: "Rooftop establishing", order: 0,
      description: rt("Establishing. María stands alone at the edge of the rooftop, back to camera."),
      frameSize: "LS", lensSize: "35mm", cameraMovements: ["STATIC"], cameraAngle: "EYE_LEVEL",
      estimatedDuration: 8, filmed: true, takes: 4, selectedTake: 3, status: "FILMED",
      people: { create: [{ personId: maria.id, action: "Stands at the edge, motionless", emotion: "Longing" }] },
      equipment: { create: [{ equipmentId: arri.id }, { equipmentId: lens35.id }] },
      props: { create: [{ propId: coat.id }] },
    },
  })
  const shot1A02 = await prisma.shot.create({
    data: {
      sceneId: scene1A.id, projectId: pid, shotNumber: "1A-02", shotName: "María CU — the message", order: 1,
      description: rt("Tight close-up on María's expression as she reads the message on her phone."),
      frameSize: "CU", lensSize: "85mm", cameraMovements: ["DOLLY", "PUSH_IN"], cameraAngle: "EYE_LEVEL",
      estimatedDuration: 6, filmed: true, takes: 6, selectedTake: 5, status: "FILMED",
      people: { create: [{ personId: maria.id, action: "Reads the message", emotion: "Shock softening into hope" }] },
      equipment: { create: [{ equipmentId: arri.id }, { equipmentId: lens85.id }] },
      props: { create: [{ propId: phone.id }] },
    },
  })
  const shot1A03 = await prisma.shot.create({
    data: {
      sceneId: scene1A.id, projectId: pid, shotNumber: "1A-03", shotName: "Carlos approach — OTS", order: 2,
      description: rt("Carlos approaches from behind. Two-shot resolving into OTS over María's shoulder."),
      frameSize: "MCU", lensSize: "50mm", cameraMovements: ["HANDHELD"], cameraAngle: "EYE_LEVEL",
      estimatedDuration: 12, filmed: false, takes: 2, status: "IN_PROGRESS",
      people: {
        create: [
          { personId: maria.id, action: "Turns slowly", emotion: "Guarded" },
          { personId: carlos.id, action: "Approaches from the stairwell", emotion: "Uncertain" },
        ],
      },
      equipment: { create: [{ equipmentId: arri.id }, { equipmentId: steadicam.id }] },
      slateConfig: {
        enabled: true,
        layout: "standard",
        fields: [
          { fieldKey: "production", label: "Production", valueSource: "auto", autoRef: "project.title" },
          { fieldKey: "director", label: "Director", valueSource: "auto", autoRef: "project.director.name" },
          { fieldKey: "scene", label: "Scene", valueSource: "auto", autoRef: "scene.number" },
          { fieldKey: "shot", label: "Shot", valueSource: "auto", autoRef: "shot.shotNumber" },
          { fieldKey: "fps", label: "FPS", valueSource: "manual", manualValue: "24" },
        ],
      },
    },
  })
  const shot1B01 = await prisma.shot.create({
    data: {
      sceneId: scene1B.id, projectId: pid, shotNumber: "1B-01", shotName: "Phone insert", order: 0,
      description: rt("Insert shot — phone screen with unread message notification glowing."),
      frameSize: "ECU", lensSize: "100mm Macro", cameraMovements: ["STATIC"], cameraAngle: "HIGH_ANGLE",
      estimatedDuration: 4, filmed: false, status: "NOT_FILMED",
      equipment: { create: [{ equipmentId: arri.id }, { equipmentId: macro100.id }] },
      props: { create: [{ propId: phone.id }] },
    },
  })
  const shot2A01 = await prisma.shot.create({
    data: {
      sceneId: scene2A.id, projectId: pid, shotNumber: "2A-01", shotName: "City aerial push", order: 0,
      description: rt("Aerial establishing. City at golden hour, slow push toward the building."),
      frameSize: "ELS", lensSize: "24mm", cameraMovements: ["DRONE", "PUSH_IN"], cameraAngle: "BIRDS_EYE",
      estimatedDuration: 10, filmed: false, status: "NOT_FILMED",
      notes: rt("BLOCKED — drone permit still pending with aviation authority."),
      equipment: { create: [{ equipmentId: drone.id }] },
    },
  })

  // Scene ↔ prop links
  await prisma.sceneProp.createMany({
    data: [
      { sceneId: scene1A.id, propId: phone.id },
      { sceneId: scene1A.id, propId: coat.id },
      { sceneId: scene1B.id, propId: phone.id },
      { sceneId: scene1A.id, propId: bottle.id },
    ],
  })

  // ── Styling ──────────────────────────────────────────────────
  await prisma.styling.create({
    data: {
      projectId: pid, characterId: maria.id, lookName: "Look 1 — Rooftop Night",
      description: rt("Monochrome silhouette against the skyline. Trench over slip dress."),
      scenes: { connect: [{ id: scene1A.id }] },
      garments: {
        create: [
          { item: "Vintage trench coat", brand: "Burberry (archive)", color: "Camel", size: "S", status: "SEARCHING" },
          { item: "Silk slip dress", brand: "—", color: "Ink black", size: "S", status: "CONFIRMED" },
        ],
      },
      accessories: { create: [{ item: "Thin gold chain", color: "Gold", status: "ON_LOAN" }] },
    },
  })

  // ── Production day ───────────────────────────────────────────
  const day1 = await prisma.productionDay.create({
    data: {
      projectId: pid,
      date: new Date("2026-08-03"),
      generalCallTime: "06:00",
      status: "PLANNED",
      generalNotes: rt("Sunset 17:52. Drone window 17:00–19:00. Rain contingency: move 1B studio coverage forward."),
      locations: { create: [{ locationId: rooftop.id }, { locationId: elevator.id }] },
    },
  })

  await prisma.crewCall.createMany({
    data: [
      { productionDayId: day1.id, department: "PHOTOGRAPHY", callTime: "06:00" },
      { productionDayId: day1.id, department: "PRODUCTION", callTime: "05:45" },
      { productionDayId: day1.id, department: "WARDROBE", callTime: "06:30" },
      { productionDayId: day1.id, personId: firstAd.id, callTime: "05:45" },
    ],
  })
  await prisma.talentCall.createMany({
    data: [
      { productionDayId: day1.id, personId: maria.id, callTime: "07:00", makeupCallTime: "07:15", onSetTime: "08:00", wrapTime: "17:00" },
      { productionDayId: day1.id, personId: carlos.id, callTime: "09:00", makeupCallTime: "09:15", onSetTime: "10:00", wrapTime: "15:00" },
    ],
  })

  const mkBlock = (data: {
    startTime: string; endTime: string; type: string; label: string;
    parallel?: boolean; parallelGroupId?: string; locationId?: string; notes?: string; order: number;
    shotIds?: string[]
  }) =>
    prisma.scheduleBlock.create({
      data: {
        productionDayId: day1.id,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type as never,
        label: data.label,
        parallel: data.parallel ?? false,
        parallelGroupId: data.parallelGroupId,
        locationId: data.locationId,
        notes: data.notes,
        order: data.order,
        shots: data.shotIds ? { create: data.shotIds.map((shotId) => ({ shotId })) } : undefined,
      },
    })

  await mkBlock({ startTime: "06:00", endTime: "07:30", type: "SETUP", label: "Crew call & camera build", locationId: rooftop.id, order: 0 })
  await mkBlock({ startTime: "07:30", endTime: "08:00", type: "WARDROBE_CHANGE", label: "Hair & makeup — María", parallel: true, parallelGroupId: "d1-early", order: 1 })
  await mkBlock({ startTime: "07:30", endTime: "08:00", type: "SETUP", label: "Lighting pre-rig — rooftop edge", parallel: true, parallelGroupId: "d1-early", locationId: rooftop.id, order: 2 })
  await mkBlock({ startTime: "08:00", endTime: "10:30", type: "SHOOTING", label: "Scene 1A — coverage", locationId: rooftop.id, order: 3, shotIds: [shot1A01.id, shot1A02.id, shot1A03.id] })
  await mkBlock({ startTime: "10:30", endTime: "11:00", type: "BREAK", label: "Break", order: 4 })
  await mkBlock({ startTime: "11:00", endTime: "11:30", type: "TRAVEL", label: "Company move → Stage 3", order: 5 })
  await mkBlock({ startTime: "11:30", endTime: "13:00", type: "SHOOTING", label: "Scene 1B — elevator inserts", locationId: elevator.id, order: 6, shotIds: [shot1B01.id] })
  await mkBlock({ startTime: "13:00", endTime: "14:00", type: "CATERING", label: "Lunch", order: 7 })
  await mkBlock({ startTime: "14:00", endTime: "14:30", type: "WARDROBE_CHANGE", label: "Wardrobe change — Look 2", order: 8 })
  await mkBlock({ startTime: "14:30", endTime: "17:00", type: "SHOOTING", label: "Scene 2A — aerial window", locationId: city.id, order: 9, shotIds: [shot2A01.id], notes: "Drone pilot on standby from 14:00" })
  await mkBlock({ startTime: "17:00", endTime: "18:00", type: "WRAP", label: "Wrap & equipment return", order: 10 })

  // ── Tasks ────────────────────────────────────────────────────
  await prisma.task.create({
    data: {
      projectId: pid, personId: producer.id, createdById: userId,
      title: "Confirm rooftop filming permit", status: "IN_PROGRESS", priority: "URGENT",
      dueDate: new Date("2026-07-25"),
      linkedEntityType: "Location", linkedEntityId: rooftop.id, locationId: rooftop.id,
      description: rt("Permit filed 2026-07-01. Follow up with district office — shoot is Aug 3."),
    },
  })
  await prisma.task.create({
    data: {
      projectId: pid, personId: producer.id, createdById: userId,
      title: "Drone corridor authorization", status: "BLOCKED", priority: "URGENT",
      dueDate: new Date("2026-07-28"),
      linkedEntityType: "Location", linkedEntityId: city.id, locationId: city.id,
      description: rt("Aviation authority reply pending. Escalate through AeroFilm if no answer by Jul 20."),
    },
  })
  await prisma.task.create({
    data: {
      projectId: pid, personId: stylist.id, createdById: userId,
      title: "Source vintage trench coat", status: "PENDING", priority: "HIGH",
      dueDate: new Date("2026-07-27"),
      linkedEntityType: "Prop", linkedEntityId: coat.id, propId: coat.id,
      description: rt("Camel archive trench, size S. Vestuario Central quoted $180 rental."),
    },
  })
  await prisma.task.create({
    data: {
      projectId: pid, personId: dop.id, createdById: userId,
      title: "Lens test — Signature Primes vs CP.3", status: "DONE", priority: "MEDIUM",
      description: rt("Tested Jul 10. Signatures win for skin tones; keep CP.3 only for the macro insert."),
    },
  })
  await prisma.task.create({
    data: {
      projectId: pid, personId: editor.id, createdById: userId,
      title: "Prep proxy workflow for dailies", status: "PENDING", priority: "LOW",
      dueDate: new Date("2026-08-02"),
    },
  })
  await prisma.task.create({
    data: {
      projectId: pid, personId: firstAd.id, createdById: userId,
      title: "Distribute call sheet — Day 1", status: "PENDING", priority: "HIGH",
      dueDate: new Date("2026-08-02"),
      linkedEntityType: "ProductionDay", linkedEntityId: day1.id,
      // multi-assignee: each department head pushes it to their team
      assignees: { create: [{ personId: producer.id }, { personId: dop.id }] },
    },
  })

  console.log(`Seeded demo project "${project.title}" (${pid})`)
  console.log(`  3 scenes, 5 shots, ${10} people, 3 locations, 3 props, 6 equipment, 1 production day, 6 tasks`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // give fire-and-forget changelog writes a beat to land
    await new Promise((r) => setTimeout(r, 1500))
    await prisma.$disconnect()
  })
