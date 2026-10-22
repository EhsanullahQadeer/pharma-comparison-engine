import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { recordAuditLog } from "@/lib/audit-log";
import { partnerSelect, toPartnerUserSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";

import type { User } from "next-auth";

// One login system for both account tables (partner-portal plan, decision 1). Each sign-in page
// names the kind it is for (the staff page sends none), so a staff login never reaches the partner
// table and a partner login never reaches staff.
async function authorizeStaff(email: string, password: string): Promise<User | null> {
  const staffUser = await prisma.staffUser.findUnique({ where: { email } });
  if (!staffUser || !staffUser.active) return null;
  if (!(await bcrypt.compare(password, staffUser.passwordHash))) return null;
  await prisma.staffUser.update({ where: { id: staffUser.id }, data: { lastLoginAt: new Date() } });
  return { kind: "staff", id: staffUser.id, email: staffUser.email, name: staffUser.name, role: staffUser.role };
}

async function authorizePartner(email: string, password: string): Promise<User | null> {
  const partner = await prisma.partnerUser.findUnique({ where: { email: email.trim().toLowerCase() }, select: partnerSelect });
  // Same rule as every partner request: active, invite accepted, pharmacy still within its access.
  if (!partner?.passwordHash || !toPartnerUserSession(partner, new Date())) return null;
  if (!(await bcrypt.compare(password, partner.passwordHash))) return null;
  await prisma.partnerUser.update({ where: { id: partner.id }, data: { lastLoginAt: new Date() } });
  await recordAuditLog({ actorId: null, action: "UPDATE", entityType: "PartnerUser", entityId: partner.id, changes: { event: "signed in to the pharmacy portal" } });
  return { kind: "partner", id: partner.id, email: partner.email, name: partner.name };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, kind: {} },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;
        const authorize = { staff: authorizeStaff, partner: authorizePartner }[credentials?.kind === "partner" ? "partner" : "staff"];
        return authorize(email, password);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.kind = user.kind;
        token.staffId = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.kind = token.kind;
      session.user.id = token.staffId;
      session.user.role = token.role;
      return session;
    },
  },
});
