import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The Supabase session pooler allows 15 clients in total, shared by every process using this
// database (dev servers, the deployed site, scripts). pg's default of 10 per pool lets one busy
// process (e.g. the admin layout's parallel pending-work counts) take most of them, so each
// process keeps a small pool and releases idle connections quickly; extra queries queue instead.
// `next build` prerenders in several worker processes, so a build worker holds a single one.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: process.env.NEXT_PHASE === "phase-production-build" ? 1 : Number(process.env.DATABASE_POOL_MAX ?? 4),
  idleTimeoutMillis: 5_000,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
