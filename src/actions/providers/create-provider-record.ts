// Server-only provider insert shared by manual creation, discovery promotion and the seed script,
// each of which runs it (top-level prisma or inside its own $transaction) after its own staff check.
// Throws Prisma's raw P2002 on a duplicate websiteDomain; callers turn that into a field error.
// Deliberately NOT a "use server" module, so it is never exposed as a callable endpoint.

import type { createProviderSchema } from "@/actions/providers/provider-schema";
import type { Prisma } from "@/generated/prisma/client";

import type { z } from "zod";

export async function createProviderRecord(tx: Prisma.TransactionClient, data: z.infer<typeof createProviderSchema>) {
  const { serviceRegions, ...rest } = data;
  return tx.provider.create({
    data: {
      ...rest,
      serviceRegions: serviceRegions
        .split(",")
        .map((region) => region.trim())
        .filter(Boolean),
    },
  });
}
