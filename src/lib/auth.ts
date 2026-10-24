import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { prisma } from "./prisma";
import { verifyPassword, writeAuditLog } from "./admission";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          await writeAuditLog({
            action: "AUTH_LOGIN_FAILURE",
            actorEmail: email,
            metadata: { reason: "USER_NOT_FOUND" },
          });
          return null;
        }

        if (user.status !== "ACTIVE") {
          await writeAuditLog({
            action: "AUTH_LOGIN_FAILURE",
            actorId: user.id,
            actorEmail: user.email,
            targetUserId: user.id,
            metadata: { reason: "USER_REVOKED" },
          });
          throw new Error("Account access has been revoked.");
        }

        const validPassword = verifyPassword(password, user.passwordHash);
        if (!validPassword) {
          await writeAuditLog({
            action: "AUTH_LOGIN_FAILURE",
            actorId: user.id,
            actorEmail: user.email,
            targetUserId: user.id,
            metadata: { reason: "INVALID_PASSWORD" },
          });
          return null;
        }

        await writeAuditLog({
          action: "AUTH_LOGIN_SUCCESS",
          actorId: user.id,
          actorEmail: user.email,
          targetUserId: user.id,
          metadata: { role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          email: string;
          name?: string | null;
          role: string;
          status: string;
          sessionVersion: number;
        };
        token.userId = u.id;
        token.email = u.email;
        token.name = u.name;
        token.role = u.role;
        token.status = u.status;
        token.sessionVersion = u.sessionVersion;
        return token;
      }

      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.userId) },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            sessionVersion: true,
          },
        });

        if (
          !dbUser ||
          dbUser.status !== "ACTIVE" ||
          dbUser.sessionVersion !== token.sessionVersion
        ) {
          token.revoked = true;
          token.status = "REVOKED";
          return token;
        }

        token.email = dbUser.email;
        token.name = dbUser.name;
        token.role = dbUser.role;
        token.status = dbUser.status;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked || token.status !== "ACTIVE" || !token.userId) {
        return {
          ...session,
          user: undefined,
          revoked: true,
        } as unknown as typeof session;
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: String(token.userId),
          email: String(token.email ?? ""),
          name: token.name ? String(token.name) : null,
          role: String(token.role ?? "USER"),
          status: String(token.status ?? "ACTIVE"),
        },
      };
    },
  },
};

export interface AuthenticatedSessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

export async function getActiveServerUser(): Promise<AuthenticatedSessionUser | null> {
  const session = await getServerSession(authOptions);
  const rawUser = session?.user as unknown as AuthenticatedSessionUser | undefined;
  if (!rawUser?.id || rawUser.status !== "ACTIVE") {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: rawUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  if (!dbUser || dbUser.status !== "ACTIVE") {
    return null;
  }

  return dbUser;
}
