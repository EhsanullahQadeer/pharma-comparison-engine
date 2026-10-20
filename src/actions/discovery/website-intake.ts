"use server";

import { revalidatePath } from "next/cache";

import { websiteIntakeSchema, type WebsiteIntakeValues } from "@/actions/discovery/website-intake-schema";
import { recordAuditLog } from "@/lib/audit-log";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { gphcNumberFromPage, intakeDomain, intakeName, intakeUrl } from "@/lib/discovery/website-intake";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export type WebsiteIntakeState = {
  error?: string;
  result?: { name: string; domain: string; retried: boolean; gphcNumber: string | null; blockedReason: string | null };
};

// Staff-submitted website → a NEW discovery candidate in the normal review queue (source
// MANUAL_WEB). Reads only the public homepage through the same guarded collector as discovery
// (HTTPS only, robots rules, no private addresses, CAPTCHA pages stop collection). A blocked read
// still adds the candidate, flagged for manual review — nothing is bypassed.
export async function submitWebsiteForReview(values: WebsiteIntakeValues): Promise<WebsiteIntakeState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add websites for review." };
  }
  const parsed = websiteIntakeSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the address and try again." };

  let url: URL;
  let domain: string;
  try {
    url = intakeUrl(parsed.data.website);
    domain = intakeDomain(parsed.data.website);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "That isn't a website address." };
  }

  const listed = await prisma.provider.findFirst({ where: { websiteDomain: { in: [domain, `www.${domain}`] } }, select: { tradingName: true } });
  if (listed) return { error: `${domain} is already listed as ${listed.tradingName}.` };
  const waiting = await prisma.discoveryCandidate.findFirst({ where: { websiteDomain: domain, status: { in: ["NEW", "PROMOTED"] } }, select: { name: true, status: true } });
  if (waiting) return { error: `${domain} is already ${waiting.status === "NEW" ? "waiting in the review queue" : "promoted"} (${waiting.name}).` };

  let page: { title?: string; finalUrl: string; html: string } | null = null;
  let blockedReason: string | null = null;
  try {
    page = await collectPublicWebsite(url.href);
  } catch (error) {
    blockedReason = error instanceof Error ? error.message : "The website could not be read.";
  }
  const gphcNumber = page ? gphcNumberFromPage(page.html) : null;
  const name = intakeName(page?.title, domain);

  const source = await prisma.discoverySource.upsert({ where: { type: "MANUAL_WEB" }, create: { type: "MANUAL_WEB", cadence: "MONTHLY", enabled: false }, update: {}, select: { id: true } });
  const key = { sourceId_sourceRecordId: { sourceId: source.id, sourceRecordId: domain } };
  const retried = Boolean(await prisma.discoveryCandidate.findUnique({ where: key, select: { id: true } }));
  const rawPayload = { intake: { submittedUrl: url.href, finalUrl: page?.finalUrl ?? null, title: page?.title ?? null, gphcNumberFromPage: gphcNumber, blockedReason, submittedByStaffId: staffUser.id, submittedAt: new Date().toISOString() } };
  const candidate = await prisma.discoveryCandidate.upsert({
    where: key,
    create: { sourceId: source.id, sourceRecordId: domain, name, websiteDomain: domain, gphcNumber, rawPayload },
    update: { name, gphcNumber, rawPayload, status: "NEW", reviewedByStaffId: null, reviewedAt: null },
    select: { id: true },
  });
  await recordAuditLog({ actorId: staffUser.id, action: retried ? "UPDATE" : "CREATE", entityType: "DiscoveryCandidate", entityId: candidate.id, changes: { source: "MANUAL_WEB", domain, blockedReason } });
  revalidatePath("/admin/reviews");
  return { result: { name, domain, retried, gphcNumber, blockedReason } };
}
