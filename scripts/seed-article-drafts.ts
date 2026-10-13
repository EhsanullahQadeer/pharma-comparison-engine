import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { sourcedArticles } from "../src/lib/sourced-articles";

// Inserts the source-checked ED articles (the content public pages show until review) as DRAFTs
// authored by the seeded admin account. Safe to re-run:
// a page that already has an article (in any status) is left untouched, so staff edits are never
// overwritten. Nothing here is public until staff publish it.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) throw new Error("SEED_ADMIN_EMAIL is not set.");
  const author = await prisma.staffUser.findUnique({ where: { email }, select: { id: true } });
  if (!author) throw new Error(`No staff user with email ${email}.`);

  let created = 0;
  for (const draft of sourcedArticles) {
    const existing = await prisma.article.findUnique({ where: { slug: draft.slug }, select: { id: true } });
    if (existing) continue;
    await prisma.article.create({ data: { ...draft, topic: draft.slug.split("/")[0], status: "DRAFT", authorId: author.id } });
    created += 1;
  }
  console.log(`Created ${created} draft article(s); ${sourcedArticles.length - created} already existed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
