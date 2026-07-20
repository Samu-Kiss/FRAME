import type { PrismaClientType, NotificationType } from "@frame/db"

// Fan-out helper for the notification inbox (MVP+). Fire-and-forget from
// mutations — a failed notification must never fail the underlying action.
export async function notify(
  prisma: PrismaClientType,
  params: {
    projectId: string
    recipientIds: string[] // User.id[]
    actorId: string // don't notify the actor about their own action
    actorName: string
    type: NotificationType
    entityType: string
    entityId: string
    message: string
  }
) {
  const recipients = [...new Set(params.recipientIds)].filter((id) => id && id !== params.actorId)
  if (recipients.length === 0) return
  try {
    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        projectId: params.projectId,
        userId,
        actorName: params.actorName,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        message: params.message,
      })),
    })
  } catch (err) {
    console.error("[notify] failed:", err)
  }
}
