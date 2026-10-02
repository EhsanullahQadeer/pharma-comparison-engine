import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// `next build` prerenders in several worker processes, each with its own pool. At pg's default of
// 10 connections per pool they overrun the database pooler's session limit, so a build worker
// holds a single connection and its queries queue behind it.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: process.env.NEXT_PHASE === "phase-production-build" ? 1 : undefined,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
