import { prisma, withoutChangelog, type PrismaClientType } from "@frame/db"
import { FULL_PERMISSIONS } from "@frame/validators"

// Deep-clones a project's entire content graph into a new project owned by
// `ownerId` (§4.1 creationSource: cloned_project / demo_template). Runs in a
// transaction; an id-remap table preserves every internal reference.

type IdMap = Map<string, string>

interface CloneOptions {
  sourceProjectId: string
  ownerId: string
  ownerName: string
  newTitle: string
  creationSource: "cloned_project" | "demo_template"
}

export async function cloneProject(opts: CloneOptions): Promise<{ id: string }> {
  const src = await prisma.project.findUniqueOrThrow({
    where: { id: opts.sourceProjectId },
    include: {
      acts: { include: { scenes: { include: { shots: true } } } },
      persons: { include: { talent: true, crew: true, postCrew: true, client: true } },
      locations: true,
      props: { include: { sceneProps: true, shotProps: true } },
      stylings: { include: { garments: true, accessories: true, scenes: true } },
      equipment: { include: { assignedTo: true, shotEquipment: true } },
      productionDays: {
        include: {
          locations: true,
          scheduleBlocks: { include: { shots: true } },
          crewCalls: true,
          talentCalls: true,
        },
      },
      script: true,
      moodboard: { include: { items: true } },
    },
  })

  // Suppress per-row changelog for the whole clone (§ bulk op) — we log a
  // single "project created" entry afterwards.
  const created = await withoutChangelog(() => prisma.$transaction(
    async (tx) => {
      const t = tx as unknown as PrismaClientType
      const project = await t.project.create({
        data: {
          title: opts.newTitle,
          type: src.type,
          client: src.client,
          brand: src.brand,
          description: src.description as never,
          status: "DEVELOPMENT",
          shootDates: src.shootDates as never,
          creationSource: opts.creationSource,
          clonedFromId: opts.creationSource === "cloned_project" ? src.id : null,
          ownerId: opts.ownerId,
          members: {
            create: { userId: opts.ownerId, projectRole: "Owner", permissions: FULL_PERMISSIONS, isAdmin: true },
          },
        },
      })
      const pid = project.id

      const persons: IdMap = new Map()
      const locations: IdMap = new Map()
      const acts: IdMap = new Map()
      const scenes: IdMap = new Map()
      const shots: IdMap = new Map()
      const props: IdMap = new Map()
      const stylings: IdMap = new Map()
      const equipment: IdMap = new Map()

      // ── Persons (+ JTI subtype rows) ──
      for (const p of src.persons) {
        const np = await t.person.create({
          data: {
            projectId: pid, name: p.name, email: p.email, phone: p.phone,
            department: p.department, role: p.role, type: p.type, callTime: p.callTime,
            notes: p.notes as never,
            // userId intentionally dropped — cloned people are contacts, not logins
          },
        })
        persons.set(p.id, np.id)
        if (p.talent) await t.talent.create({ data: { personId: np.id, characterName: p.talent.characterName, agencyName: p.talent.agencyName, agencyContact: p.talent.agencyContact, measurements: p.talent.measurements as never, portfolio: p.talent.portfolio, availability: p.talent.availability as never } })
        if (p.crew) await t.crew.create({ data: { personId: np.id, crewType: p.crew.crewType, vehicle: p.crew.vehicle } })
        if (p.postCrew) await t.postCrew.create({ data: { personId: np.id, deliverables: p.postCrew.deliverables, software: p.postCrew.software, availability: p.postCrew.availability as never } })
        if (p.client) await t.clientPerson.create({ data: { personId: np.id, companyName: p.client.companyName, position: p.client.position, approvalRequired: p.client.approvalRequired } })
      }

      // ── Locations ──
      for (const l of src.locations) {
        const nl = await t.location.create({
          data: {
            projectId: pid, name: l.name, type: l.type, address: l.address,
            coordinates: l.coordinates as never, contactName: l.contactName, contactPhone: l.contactPhone,
            permitRequired: l.permitRequired, permitStatus: l.permitStatus,
            scoutingNotes: l.scoutingNotes as never, accessNotes: l.accessNotes as never,
            powerAvailable: l.powerAvailable, amenities: l.amenities, availableDates: l.availableDates as never,
          },
        })
        locations.set(l.id, nl.id)
      }

      // ── Equipment ──
      for (const e of src.equipment) {
        const ne = await t.equipment.create({
          data: {
            projectId: pid, name: e.name, type: e.type, brand: e.brand, model: e.model,
            serialNumber: e.serialNumber, rentalSource: e.rentalSource, availableDates: e.availableDates as never, notes: e.notes,
          },
        })
        equipment.set(e.id, ne.id)
      }

      // ── Structure: acts → scenes → shots ──
      for (const act of src.acts) {
        const na = await t.act.create({ data: { projectId: pid, number: act.number, title: act.title, description: act.description as never, order: act.order } })
        acts.set(act.id, na.id)
        for (const scene of act.scenes) {
          const ns = await t.scene.create({
            data: {
              actId: na.id, projectId: pid, number: scene.number, title: scene.title,
              synopsis: scene.synopsis as never, daylight: scene.daylight,
              estimatedDuration: scene.estimatedDuration, status: scene.status, notes: scene.notes as never, order: scene.order,
              locationId: scene.locationId ? locations.get(scene.locationId) : null,
            },
          })
          scenes.set(scene.id, ns.id)
          for (const shot of scene.shots) {
            const nsh = await t.shot.create({
              data: {
                sceneId: ns.id, projectId: pid, shotNumber: shot.shotNumber, shotName: shot.shotName,
                description: shot.description as never, order: shot.order,
                frameSize: shot.frameSize, lensSize: shot.lensSize, cameraMovements: shot.cameraMovements, cameraAngle: shot.cameraAngle,
                voiceover: shot.voiceover as never, soundEffects: shot.soundEffects, musicRef: shot.musicRef,
                estimatedDuration: shot.estimatedDuration, filmed: shot.filmed, takes: shot.takes, selectedTake: shot.selectedTake,
                postNotes: shot.postNotes as never, notes: shot.notes as never, status: shot.status, slateConfig: shot.slateConfig as never,
              },
            })
            shots.set(shot.id, nsh.id)
          }
        }
      }

      // ── Shot ↔ Person junctions ──
      const srcShotPeople = await t.shotPerson.findMany({ where: { shot: { projectId: src.id } } })
      for (const sp of srcShotPeople) {
        const shotId = shots.get(sp.shotId), personId = persons.get(sp.personId)
        if (shotId && personId) await t.shotPerson.create({ data: { shotId, personId, role: sp.role, action: sp.action, emotion: sp.emotion } })
      }

      // ── Props (+ scene/shot links) ──
      for (const p of src.props) {
        const np = await t.prop.create({
          data: {
            projectId: pid, name: p.name, description: p.description as never, category: p.category,
            quantity: p.quantity, status: p.status, source: p.source, sourceName: p.sourceName, cost: p.cost, notes: p.notes as never,
          },
        })
        props.set(p.id, np.id)
        for (const sp of p.sceneProps) { const sceneId = scenes.get(sp.sceneId); if (sceneId) await t.sceneProp.create({ data: { sceneId, propId: np.id } }) }
        for (const sp of p.shotProps) { const shotId = shots.get(sp.shotId); if (shotId) await t.shotProp.create({ data: { shotId, propId: np.id } }) }
      }

      // ── Stylings (+ items, scene m2m, shot m2m) ──
      for (const s of src.stylings) {
        const characterId = persons.get(s.characterId)
        if (!characterId) continue
        const ns = await t.styling.create({
          data: {
            projectId: pid, characterId, lookName: s.lookName, description: s.description as never,
            hairRef: s.hairRef as never, makeupRef: s.makeupRef as never, notes: s.notes as never,
            scenes: { connect: s.scenes.map((sc) => ({ id: scenes.get(sc.id)! })).filter((x) => x.id) },
          },
        })
        stylings.set(s.id, ns.id)
        for (const g of s.garments) await t.garment.create({ data: { stylingId: ns.id, item: g.item, brand: g.brand, color: g.color, size: g.size, status: g.status } })
        for (const a of s.accessories) await t.accessory.create({ data: { stylingId: ns.id, item: a.item, brand: a.brand, color: a.color, size: a.size, status: a.status } })
      }
      const srcShotStyling = await t.shotStyling.findMany({ where: { shot: { projectId: src.id } } })
      for (const ss of srcShotStyling) { const shotId = shots.get(ss.shotId), stylingId = stylings.get(ss.stylingId); if (shotId && stylingId) await t.shotStyling.create({ data: { shotId, stylingId } }) }

      // ── Equipment junctions ──
      for (const e of src.equipment) {
        const equipmentId = equipment.get(e.id)!
        for (const a of e.assignedTo) { const crewId = persons.get(a.crewId); if (crewId) await t.personEquipment.create({ data: { crewId, equipmentId } }) }
        for (const se of e.shotEquipment) { const shotId = shots.get(se.shotId); if (shotId) await t.shotEquipment.create({ data: { shotId, equipmentId } }) }
      }

      // ── Production days ──
      for (const day of src.productionDays) {
        const nd = await t.productionDay.create({
          data: {
            projectId: pid, date: day.date, generalCallTime: day.generalCallTime,
            generalNotes: day.generalNotes as never, status: day.status,
            locations: { create: day.locations.map((dl) => ({ locationId: locations.get(dl.locationId)! })).filter((x) => x.locationId) },
          },
        })
        for (const block of day.scheduleBlocks) {
          await t.scheduleBlock.create({
            data: {
              productionDayId: nd.id, startTime: block.startTime, endTime: block.endTime, type: block.type,
              label: block.label, parallel: block.parallel, parallelGroupId: block.parallelGroupId,
              locationId: block.locationId ? locations.get(block.locationId) : null, notes: block.notes, order: block.order,
              shots: { create: block.shots.map((bs) => ({ shotId: shots.get(bs.shotId)! })).filter((x) => x.shotId) },
            },
          })
        }
        for (const c of day.crewCalls) { await t.crewCall.create({ data: { productionDayId: nd.id, personId: c.personId ? persons.get(c.personId) : null, department: c.department, callTime: c.callTime } }) }
        for (const c of day.talentCalls) { const personId = persons.get(c.personId); if (personId) await t.talentCall.create({ data: { productionDayId: nd.id, personId, callTime: c.callTime, makeupCallTime: c.makeupCallTime, onSetTime: c.onSetTime, wrapTime: c.wrapTime } }) }
      }

      // ── Script + project moodboard ──
      if (src.script) await t.script.create({ data: { projectId: pid, content: src.script.content as never } })
      if (src.moodboard) {
        const nb = await t.moodboardBoard.create({ data: { projectId: pid, title: src.moodboard.title, layout: src.moodboard.layout } })
        for (const item of src.moodboard.items) {
          await t.moodboardItem.create({
            data: {
              boardId: nb.id, type: item.type, color: item.color, content: item.content, caption: item.caption,
              posX: item.posX, posY: item.posY, width: item.width, height: item.height, order: item.order,
              // assetId dropped — assets belong to the source project's storage scope
            },
          })
        }
      }

      return { id: pid }
    },
    { timeout: 30_000 }
  ))

  // Single changelog entry marking the new project's creation
  await prisma.changeEntry.create({
    data: {
      projectId: created.id,
      userId: opts.ownerId,
      entityType: "Project",
      entityId: created.id,
      action: "CREATED",
      note: opts.creationSource === "demo_template" ? "Created from demo template" : "Cloned from an existing project",
    },
  }).catch(() => {})

  return created
}
