# FRAME — Development Guide

Technical companion to the [README](../README.md). The full spec lives in
[TECHNICAL DOC.md](../TECHNICAL%20DOC.md) (§0 documents the implementation resolutions).

## Stack

Turborepo + pnpm monorepo:

| Package | What |
|---|---|
| `apps/web` | Next.js 15 App Router · Tailwind 4 · tRPC client |
| `apps/api` | Hono + tRPC 11 · Supabase auth verification · React-PDF exports |
| `packages/db` | Prisma schema + client with automatic changelog (`$extends`) |
| `packages/validators` | Shared Zod schemas |
| `packages/tsconfig` | Base TS configs |

Local dev runs **everything locally** (Supabase CLI in Docker). Production uses the
same code against **Supabase cloud + Vercel (web) + Railway/Fly (api)**.

## Local setup

Prerequisites: Node 20+, pnpm, Docker Desktop.

```bash
pnpm install

# 1. Start the local Supabase stack (Postgres + Auth + Storage)
npx supabase start
#    → copy the printed values into the env files:

# 2. Env files
cp apps/api/.env.example apps/api/.env          # SERVICE_ROLE key + DB URL
cp apps/web/.env.example apps/web/.env.local    # ANON key
cp packages/db/.env.example packages/db/.env    # DATABASE_URL + service role (for seed)

# 3. Create schema + demo data
pnpm db:migrate      # prisma migrate dev
pnpm db:seed         # demo project + demo user

# 4. Run both apps
pnpm dev             # web on :4000, api on :4001
```

> This repo's local Supabase is configured on ports **54341 (API) / 54342 (DB) /
> 54343 (Studio)** — shifted from the defaults so it can run alongside other
> local Supabase projects.

**Demo login:** `demo@frame.app` / `frame-demo-1234` — a fully populated commercial
production ("AFTERGLOW") with scenes, shots, people, tasks, locations, props,
equipment and a production day with parallel schedule blocks.

### Useful commands

```bash
pnpm test           # vitest (diff util, plan limits, validators)
pnpm typecheck      # tsc across the workspace
pnpm db:generate    # regenerate the Prisma client
npx supabase stop   # stop the local stack
```

## Architecture notes

- **Type safety end-to-end**: `apps/web` imports only `type { AppRouter }` from
  `@frame/api` — zero runtime coupling (§2.4 of the doc).
- **Changelog**: every mutation on tracked models is intercepted by the Prisma
  `$extends` client in `packages/db/src/index.ts`; the acting user flows in via
  AsyncLocalStorage. Diffs are JSONPatch-like (`packages/db/src/diff.ts`).
- **Permissions**: tRPC middleware chain `authed → project membership →
  permission guard → plan limits` in `apps/api/src/trpc.ts`.
- **Freemium**: `apps/api/src/config/plans.ts` is the single source of truth.
  The API is the only real gate; the UI just mirrors messages
  (`PLAN_LIMIT_EXCEEDED:*`).
- **Exports**: synchronous render in `apps/api/src/services/pdfExport.tsx`,
  uploaded to Supabase Storage, returned as a 1h signed URL. This module is the
  seam where the BullMQ worker plugs in later (§2.14).

## Production deploy

Same code, cloud env vars:

1. **Supabase cloud** — create a project; run `pnpm --filter @frame/db deploy`
   (`prisma migrate deploy`) against its `DATABASE_URL`.
2. **API** (Railway / Fly.io) — deploy `apps/api` with:
   `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `STORAGE_BUCKET=frame-assets`, `WEB_ORIGIN=<web URL>`, `NODE_ENV=production`.
   Start command: `pnpm --filter @frame/api start`.
3. **Web** (Vercel) — root `apps/web`, env:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_API_URL=<api URL>`.

The `SERVICE_ROLE_KEY` only ever lives in the API (§2.11 of the technical doc).

## Deferred (next iterations)

Script editor (TipTap), Moodboards, Stylings UI, Slate generator, async export queue
(BullMQ + Redis), Supabase Realtime feed, RLS policies, rate limiting. The seams for
each are in place — see `apps/api/src/services/pdfExport.tsx` and §2.14 of the doc.

## README images

The visual README is generated from `docs/readme/product-summary.html` (a static
replica of `Product Summary.jsx`). To regenerate the PNGs after editing it:

```bash
# requires Chrome installed; uses puppeteer-core
node docs/readme/shoot.mjs
```
