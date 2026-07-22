import { PrismaClient, Prisma } from "@prisma/client"
import { computeDiff } from "./diff.js"
import { getCurrentUserId, isChangelogSuppressed } from "./context.js"

export * from "@prisma/client"
export { Prisma }
export { computeDiff } from "./diff.js"
export type { DiffOp } from "./diff.js"
export { requestContext, getCurrentUserId, withoutChangelog } from "./context.js"
export type { RequestContext } from "./context.js"

// Models tracked by the global changelog (§4.2). Each resolves its
// projectId from a denormalized column; Project resolves to itself.
const CHANGELOG_MODELS = new Set([
  "Project",
  "Act",
  "Scene",
  "Shot",
  "Person",
  "Location",
  "Prop",
  "Styling",
  "Equipment",
  "ProductionDay",
  "Task",
])

const WRITE_OPERATIONS = new Set(["create", "update", "delete", "upsert"])

type AnyRecord = Record<string, unknown>

const base = new PrismaClient()

async function logChange(params: {
  model: string
  operation: string
  before: AnyRecord | null
  result: AnyRecord | null
}) {
  const { model, operation, before, result } = params
  const record = result ?? before
  if (!record) return

  const projectId =
    model === "Project" ? (record.id as string) : (record.projectId as string | undefined)
  if (!projectId) return

  const action =
    operation === "create" || (operation === "upsert" && !before)
      ? "CREATED"
      : operation === "delete"
        ? "DELETED"
        : "UPDATED"

  const diff = action === "UPDATED" ? computeDiff(before, result) : null
  if (action === "UPDATED" && diff && diff.length === 0) return

  await base.changeEntry.create({
    data: {
      projectId,
      userId: getCurrentUserId() ?? null,
      entityType: model,
      entityId: record.id as string,
      action,
      diff: diff ? (diff as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  })
}

export const prisma = base.$extends({
  name: "changelog",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!WRITE_OPERATIONS.has(operation) || !CHANGELOG_MODELS.has(model) || isChangelogSuppressed()) {
          return query(args)
        }

        // Snapshot before the mutation so we can diff (update/delete/upsert)
        let before: AnyRecord | null = null
        const where = (args as { where?: AnyRecord }).where
        if (operation !== "create" && where) {
          try {
            before = (await (base as never as Record<string, { findFirst: (a: unknown) => Promise<AnyRecord | null> }>)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ]!.findFirst({ where })) as AnyRecord | null
          } catch {
            before = null
          }
        }

        const result = (await query(args)) as AnyRecord | null

        // Fire-and-forget — the changelog must never block or fail a mutation
        void logChange({ model, operation, before, result }).catch((err) => {
          console.error(`[changelog] failed to log ${operation} on ${model}:`, err)
        })

        return result
      },
    },
  },
})

export type PrismaClientType = typeof prisma
