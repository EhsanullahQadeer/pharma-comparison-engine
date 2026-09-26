import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const staffUser = await prisma.staffUser.findUnique({ where: { email } });
        if (!staffUser || !staffUser.active) return null;

        const passwordMatches = await bcrypt.compare(password, staffUser.passwordHash);
        if (!passwordMatches) return null;

        await prisma.staffUser.update({ where: { id: staffUser.id }, data: { lastLoginAt: new Date() } });

        return { kind: "staff", id: staffUser.id, email: staffUser.email, name: staffUser.name, role: staffUser.role };
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
