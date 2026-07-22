import { z } from "zod"
import { router, projectProcedure } from "../trpc.js"
import { getForecast } from "../services/weather.js"

// Forecast for exterior locations that have coordinates, keyed to the
// project's shoot dates (v2.0). Any failure degrades to an empty list —
// the UI simply omits the badge.
export const weatherRouter = router({
  forecast: projectProcedure
    .input(z.object({ projectId: z.string(), locationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const location = await ctx.prisma.location.findUnique({
        where: { id: input.locationId },
        select: { projectId: true, type: true, coordinates: true },
      })
      if (!location || location.projectId !== input.projectId) return { forecast: null }

      const coords = location.coordinates as { lat?: number; lng?: number } | null
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        return { forecast: null }
      }

      // Dates come from the project's production days (actual shoot dates).
      const days = await ctx.prisma.productionDay.findMany({
        where: { projectId: input.projectId },
        select: { date: true },
        orderBy: { date: "asc" },
      })
      const dates = days.map((d) => d.date.toISOString().slice(0, 10))
      if (dates.length === 0) return { forecast: null }

      const forecast = await getForecast(coords.lat, coords.lng, dates)
      return { forecast }
    }),
})
