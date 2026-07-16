import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { trpcServer } from "@hono/trpc-server"
import { appRouter } from "./routers/index.js"
import { createContext } from "./context.js"
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
