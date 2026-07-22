import { z } from "zod"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { breakdownScript } from "../services/breakdown.js"

function rt(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }] }
}

export const breakdownRouter = router({
  // Parse the project's script into draft scenes — no writes (§1.10 auto-breakdown)
  preview: projectProcedure.query(async ({ ctx, input }) => {
    const script = await ctx.prisma.script.findUnique({ where: { projectId: input.projectId } })
    const result = script ? breakdownScript(script.content) : { scenes: [], characters: [] }

    // Flag which scenes / characters already exist so the UI can show "new" vs "existing"
    const [existingScenes, existingPersons] = await Promise.all([
      ctx.prisma.scene.findMany({ where: { projectId: input.projectId }, select: { title: true, number: true } }),
      ctx.prisma.person.findMany({ where: { projectId: input.projectId }, select: { name: true } }),
    ])
    const sceneTitles = new Set(existingScenes.map((s) => s.title.toLowerCase()))
    const personNames = new Set(existingPersons.map((p) => p.name.toLowerCase()))

    return {
      scenes: result.scenes.map((s) => ({ ...s, exists: sceneTitles.has(s.location.toLowerCase()) })),
      characters: result.characters.map((name) => ({ name, exists: personNames.has(name.toLowerCase()) })),
    }
  }),

  applyBreakdown: requirePermission("canEditShotlist")
    .input(
      z.object({
        projectId: z.string(),
        createScenes: z.boolean().default(true),
        createCharacters: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const script = await ctx.prisma.script.findUnique({ where: { projectId: input.projectId } })
      if (!script) return { scenesCreated: 0, charactersCreated: 0 }
      const parsed = breakdownScript(script.content)

      let scenesCreated = 0
      let charactersCreated = 0

      if (input.createScenes && parsed.scenes.length) {
        // Land new scenes under an act (reuse first act or create "Act 1")
        let act = await ctx.prisma.act.findFirst({
          where: { projectId: input.projectId },
          orderBy: { order: "asc" },
        })
        if (!act) {
          act = await ctx.prisma.act.create({
            data: { projectId: input.projectId, number: 1, title: "Act 1", order: 0 },
          })
        }
        const existing = await ctx.prisma.scene.findMany({
          where: { projectId: input.projectId },
          select: { title: true, number: true },
        })
        const existingTitles = new Set(existing.map((s) => s.title.toLowerCase()))
        let maxOrder = (await ctx.prisma.scene.findFirst({ where: { actId: act.id }, orderBy: { order: "desc" } }))?.order ?? -1
        let seq = existing.length

        for (const s of parsed.scenes) {
          const title = s.location || s.heading
          if (existingTitles.has(title.toLowerCase())) continue
          seq += 1
          maxOrder += 1
          await ctx.prisma.scene.create({
            data: {
              actId: act.id,
              projectId: input.projectId,
              number: String(seq),
              title,
              synopsis: s.action ? rt(s.action) : undefined,
              daylight: s.daylight as never,
              order: maxOrder,
            },
          })
          existingTitles.add(title.toLowerCase())
          scenesCreated += 1
        }
      }

      if (input.createCharacters && parsed.characters.length) {
        const existingPersons = await ctx.prisma.person.findMany({
          where: { projectId: input.projectId },
          select: { name: true },
        })
        const names = new Set(existingPersons.map((p) => p.name.toLowerCase()))
        for (const raw of parsed.characters) {
          // Screenplay names are UPPERCASE — title-case them for the roster
          const name = raw.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          if (names.has(name.toLowerCase())) continue
          await ctx.prisma.person.create({
            data: {
              projectId: input.projectId,
              name,
              department: "TALENT",
              role: "Character",
              type: "TALENT",
              talent: { create: { characterName: name } },
            },
          })
          names.add(name.toLowerCase())
          charactersCreated += 1
        }
      }

      return { scenesCreated, charactersCreated }
    }),
})
