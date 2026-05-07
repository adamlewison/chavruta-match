import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  emailPasscodes,
} from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      id: "passcode",
      name: "Email Passcode",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const email = credentials.email as string;
        const code = credentials.code as string;

        // Verify passcode
        const now = new Date();
        const passcodeRecord = await db.query.emailPasscodes.findFirst({
          where: and(
            eq(emailPasscodes.email, email),
            eq(emailPasscodes.code, code),
            gt(emailPasscodes.expires, now),
          ),
        });

        if (!passcodeRecord) {
          return null;
        }

        // Delete used passcode
        await db
          .delete(emailPasscodes)
          .where(eq(emailPasscodes.id, passcodeRecord.id));

        // Find or create user
        let user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          const newUsers = await db
            .insert(users)
            .values({
              email,
              name: email.split("@")[0],
              emailVerified: new Date(),
            })
            .returning();
          user = newUsers[0];
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
