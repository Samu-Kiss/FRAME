"use client"

import { createTRPCReact } from "@trpc/react-query"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@frame/api" // type-only — zero runtime import (§2.4)

export const trpc = createTRPCReact<AppRouter>()

export type RouterOutputs = inferRouterOutputs<AppRouter>
