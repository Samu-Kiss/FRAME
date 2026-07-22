import { z } from "zod"
import { router, authedProcedure } from "../trpc.js"
import { PLAN_LIMITS } from "../config/plans.js"
import { projectRouter } from "./project.js"
import { structureRouter } from "./structure.js"
import { personsRouter } from "./persons.js"
import { tasksRouter } from "./tasks.js"
import { locationsRouter } from "./locations.js"
import { propsRouter } from "./props.js"
import { stylingsRouter } from "./stylings.js"
import { scriptRouter } from "./script.js"
import { moodboardRouter } from "./moodboard.js"
import { slateRouter } from "./slate.js"
import { commentsRouter } from "./comments.js"
import { notificationsRouter } from "./notifications.js"
import { equipmentRouter } from "./equipment.js"
import { productionDayRouter } from "./productionDay.js"
import { changelogRouter } from "./changelog.js"
import { exportsRouter } from "./exports.js"
import { budgetRouter } from "./budget.js"
import { weatherRouter } from "./weather.js"
import { breakdownRouter } from "./breakdown.js"

export const appRouter = router({
  me: authedProcedure.query(({ ctx }) => {
    const limits = PLAN_LIMITS[ctx.plan]
    return {
      id: ctx.dbUser.id,
      email: ctx.dbUser.email,
      name: ctx.dbUser.name,
      plan: ctx.plan,
      language: ctx.dbUser.language,
      limits: {
        // Infinity is not JSON-serializable through superjson? It is — but
        // send a plain shape the UI can render either way.
        maxActiveProjects: limits.maxActiveProjects,
        maxCollaborators: limits.maxCollaborators,
        exportsPerDay: limits.exportsPerDay,
        granularPermissions: limits.granularPermissions,
        slateGenerator: limits.slateGenerator,
        advancedExports: limits.advancedExports,
        exports: limits.exports,
      },
    }
  }),
  setLanguage: authedProcedure
    .input(z.object({ language: z.enum(["EN", "ES"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({ where: { id: ctx.dbUser.id }, data: { language: input.language } })
      return { ok: true }
    }),
  project: projectRouter,
  structure: structureRouter,
  persons: personsRouter,
  tasks: tasksRouter,
  locations: locationsRouter,
  props: propsRouter,
  stylings: stylingsRouter,
  script: scriptRouter,
  moodboard: moodboardRouter,
  slate: slateRouter,
  comments: commentsRouter,
  notifications: notificationsRouter,
  equipment: equipmentRouter,
  productionDay: productionDayRouter,
  changelog: changelogRouter,
  exports: exportsRouter,
  budget: budgetRouter,
  weather: weatherRouter,
  breakdown: breakdownRouter,
})

export type AppRouter = typeof appRouter
