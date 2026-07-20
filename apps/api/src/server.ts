import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { trpcServer } from "@hono/trpc-server"
import { prisma } from "@frame/db"
import { appRouter } from "./routers/index.js"
import { createContext } from "./context.js"
import { verifyToken } from "./lib/supabase.js"
import { uploadPublicImage } from "./lib/storage.js"
import { env } from "./env.js"

const app = new Hono()

app.use(
  "*",
  cors({
    origin: [env.WEB_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
)

app.get("/health", (c) => c.json({ ok: true, service: "frame-api" }))

// Image upload (moodboard / references) — multipart, membership-gated.
// tRPC stays JSON-only; this is the one binary endpoint (§6.3).
app.post("/upload", async (c) => {
  const header = c.req.header("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined
  const user = await verifyToken(token)
  if (!user) return c.json({ error: "UNAUTHORIZED" }, 401)

  const form = await c.req.formData()
  const projectId = form.get("projectId")
  const scope = form.get("scope") ?? "moodboard"
  const file = form.get("file")
  if (typeof projectId !== "string" || !(file instanceof File)) {
    return c.json({ error: "BAD_REQUEST" }, 400)
  }
  if (!file.type.startsWith("image/")) return c.json({ error: "IMAGES_ONLY" }, 400)

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  })
  if (!membership) return c.json({ error: "FORBIDDEN" }, 403)

  const body = Buffer.from(await file.arrayBuffer())
  const { storagePath, publicUrl } = await uploadPublicImage({
    projectId,
    scope: String(scope),
    filename: file.name,
    body,
    contentType: file.type,
  })
  const asset = await prisma.asset.create({
    data: {
      projectId,
      filename: file.name,
      mimeType: file.type,
      size: body.length,
      storagePath,
      publicUrl,
      uploadedById: user.id,
    },
  })
  return c.json({ assetId: asset.id, publicUrl })
})

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (opts) => createContext(opts.req),
  })
)

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`FRAME API listening on http://localhost:${info.port}`)
})
