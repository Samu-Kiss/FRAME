import { z } from "zod"
import { taskCreateSchema, taskUpdateSchema, taskStatusSchema } from "@frame/validators"
import { router, projectProcedure } from "../trpc.js"
import { assertInProject } from "./structure.js"

// `as const` keeps the literal `true`s — otherwise Prisma's payload
// inference degrades and the client-side types turn into `any`.
const taskInclude = {
  person: { select: { id: true, name: true, department: true } },
  assignees: { include: { person: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true } },
  prop: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
} as const

// Tasks are the operational inbox of every project member (§4.6) —
// membership is enough to create/manage them, no granular permission.
export const tasksRouter = router({
  list: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        personId: z.string().optional(),
        status: taskStatusSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.task.findMany({
        where: {
          projectId: input.projectId,
          // a person's board shows what they own AND what they're assigned to
          ...(input.personId
            ? { OR: [{ personId: input.personId }, { assignees: { some: { personId: input.personId } } }] }
            : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: taskInclude,
      })
    }),

  create: projectProcedure.input(taskCreateSchema).mutation(async ({ ctx, input }) => {
    // the owner already sees the task on their board — don't double-list them
    const assigneeIds = input.assigneeIds?.filter((id) => id !== input.personId)
    return ctx.prisma.task.create({
      data: {
        projectId: input.projectId,
        personId: input.personId,
        title: input.title,
        description: input.description as never,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        propId: input.propId,
        locationId: input.locationId,
        createdById: ctx.dbUser.id,
        assignees: assigneeIds?.length
          ? { create: assigneeIds.map((personId) => ({ personId })) }
          : undefined,
      },
      include: taskInclude,
    })
  }),

  update: projectProcedure.input(taskUpdateSchema).mutation(async ({ ctx, input }) => {
    await assertInProject(ctx.prisma.task, input.taskId, input.projectId, "task")
    const { dueDate, description, ...rest } = input.data
    const task = await ctx.prisma.task.update({
      where: { id: input.taskId },
      data: {
        ...rest,
        description: description as never,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
      include: taskInclude,
    })
    if (input.assigneeIds) {
      const assigneeIds = input.assigneeIds.filter((id) => id !== task.personId)
      await ctx.prisma.taskAssignee.deleteMany({ where: { taskId: input.taskId } })
      if (assigneeIds.length) {
        await ctx.prisma.taskAssignee.createMany({
          data: assigneeIds.map((personId) => ({ taskId: input.taskId, personId })),
        })
      }
    }
    return task
  }),

  delete: projectProcedure
    .input(z.object({ projectId: z.string(), taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertInProject(ctx.prisma.task, input.taskId, input.projectId, "task")
      await ctx.prisma.task.delete({ where: { id: input.taskId } })
      return { ok: true }
    }),
})
