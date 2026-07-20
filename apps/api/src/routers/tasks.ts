import { z } from "zod"
import { taskCreateSchema, taskUpdateSchema, taskStatusSchema } from "@frame/validators"
import { router, projectProcedure } from "../trpc.js"
import { assertInProject } from "./structure.js"
import { notify } from "../services/notify.js"
import type { PrismaClientType } from "@frame/db"

// Maps assigned production Persons to the User accounts that should be
// notified (a Person without a login simply produces no notification).
async function notifyAssignees(
  prisma: PrismaClientType,
  params: { projectId: string; personIds: string[]; taskId: string; taskTitle: string; actorId: string; actorName: string }
) {
  if (!params.personIds.length) return
  const persons = await prisma.person.findMany({
    where: { id: { in: params.personIds }, userId: { not: null } },
    select: { userId: true },
  })
  await notify(prisma, {
    projectId: params.projectId,
    recipientIds: persons.map((p) => p.userId!).filter(Boolean),
    actorId: params.actorId,
    actorName: params.actorName,
    type: "TASK_ASSIGNED",
    entityType: "Task",
    entityId: params.taskId,
    message: `${params.actorName} assigned you a task: ${params.taskTitle}`,
  })
}

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
    const task = await ctx.prisma.task.create({
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
    void notifyAssignees(ctx.prisma, {
      projectId: input.projectId,
      personIds: assigneeIds ?? [],
      taskId: task.id,
      taskTitle: task.title,
      actorId: ctx.dbUser.id,
      actorName: ctx.dbUser.name,
    })
    return task
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
      const existing = await ctx.prisma.taskAssignee.findMany({
        where: { taskId: input.taskId },
        select: { personId: true },
      })
      const existingIds = new Set(existing.map((a) => a.personId))
      await ctx.prisma.taskAssignee.deleteMany({ where: { taskId: input.taskId } })
      if (assigneeIds.length) {
        await ctx.prisma.taskAssignee.createMany({
          data: assigneeIds.map((personId) => ({ taskId: input.taskId, personId })),
        })
      }
      // notify only the newly added assignees
      void notifyAssignees(ctx.prisma, {
        projectId: input.projectId,
        personIds: assigneeIds.filter((id) => !existingIds.has(id)),
        taskId: task.id,
        taskTitle: task.title,
        actorId: ctx.dbUser.id,
        actorName: ctx.dbUser.name,
      })
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
