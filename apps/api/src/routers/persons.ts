import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { personCreateSchema, personUpdateSchema } from "@frame/validators"
import { router, projectProcedure, requirePermission } from "../trpc.js"
import { assertInProject } from "./structure.js"

export const personsRouter = router({
  list: projectProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.person.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ department: "asc" }, { name: "asc" }],
      include: {
        talent: true,
        crew: true,
        postCrew: true,
        client: true,
        _count: {
          select: {
            tasks: { where: { status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] } } },
            taskAssignments: {
              where: { task: { status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] } } },
            },
            shotPeople: true,
          },
        },
      },
    })
  }),

  get: projectProcedure
    .input(z.object({ projectId: z.string(), personId: z.string() }))
    .query(async ({ ctx, input }) => {
      const person = await ctx.prisma.person.findUnique({
        where: { id: input.personId },
        include: {
          talent: true,
          crew: { include: { equipment: { include: { equipment: true } } } },
          postCrew: true,
          client: true,
          tasks: { orderBy: [{ priority: "desc" }, { dueDate: "asc" }] },
          taskAssignments: { include: { task: true } },
          shotPeople: {
            include: {
              shot: { select: { id: true, shotNumber: true, shotName: true, status: true } },
            },
          },
        },
      })
      if (!person || person.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ENTITY_NOT_FOUND:person" })
      }
      return person
    }),

  create: requirePermission("canEditPeople")
    .input(personCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.person.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          department: input.department,
          role: input.role,
          type: input.type,
          callTime: input.callTime,
          notes: input.notes as never,
          talent: input.type === "TALENT"
            ? { create: { ...input.talent, measurements: input.talent?.measurements as never } }
            : undefined,
          crew: input.type === "CREW" && input.crew ? { create: input.crew } : undefined,
          postCrew: input.type === "POST_CREW" ? { create: { ...input.postCrew } } : undefined,
          client: input.type === "CLIENT" && input.client ? { create: input.client } : undefined,
        },
        include: { talent: true, crew: true, postCrew: true, client: true },
      })
    }),

  update: requirePermission("canEditPeople")
    .input(personUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.person, input.personId, input.projectId, "person")
      return ctx.prisma.person.update({
        where: { id: input.personId },
        data: {
          ...input.data,
          notes: input.data.notes as never,
          talent: input.talent
            ? {
                upsert: {
                  update: { ...input.talent, measurements: input.talent.measurements as never },
                  create: { ...input.talent, measurements: input.talent.measurements as never },
                },
              }
            : undefined,
          crew: input.crew?.crewType
            ? { upsert: { update: input.crew, create: { crewType: input.crew.crewType, vehicle: input.crew.vehicle } } }
            : undefined,
          postCrew: input.postCrew
            ? { upsert: { update: input.postCrew, create: input.postCrew } }
            : undefined,
          client: input.client?.companyName
            ? {
                upsert: {
                  update: input.client,
                  create: { ...input.client, companyName: input.client.companyName },
                },
              }
            : undefined,
        },
        include: { talent: true, crew: true, postCrew: true, client: true },
      })
    }),

  delete: requirePermission("canEditPeople")
    .input(z.object({ projectId: z.string(), personId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.person, input.personId, input.projectId, "person")
      await ctx.prisma.person.delete({ where: { id: input.personId } })
      return { ok: true }
    }),
})
