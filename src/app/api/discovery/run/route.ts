import { NextResponse } from "next/server";

import { runSource } from "@/lib/discovery/run-source";
import { prisma } from "@/lib/prisma";

// Vercel Cron invokes cron-configured routes with GET and automatically attaches
// `Authorization: Bearer <CRON_SECRET>` when a CRON_SECRET env var is set — this checks that same
// header so the route can't be triggered by an arbitrary request. vercel.json's single daily entry
// self-selects which sources are actually due (nextRunAt), so a more frequent hit on a paid plan
// works identically with no code change here.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dueSources = await prisma.discoverySource.findMany({
    where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
  });

  const ran: string[] = [];
  for (const source of dueSources) {
    // Sequential, not parallel — keeps free-tier rate limits safe and DiscoveryRun ordering simple.
    await runSource(source);
    ran.push(source.type);
  }

  const skipped = await prisma.discoverySource.findMany({
    where: { enabled: true, id: { notIn: dueSources.map((source) => source.id) } },
    select: { type: true },
  });

  return NextResponse.json({ ran, skipped: skipped.map((source) => source.type) });
}
