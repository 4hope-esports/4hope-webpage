import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      // account.providerAccountId is Google's stable "sub" claim — use it as
      // the Firestore users/{uid} doc id so it never changes across sessions.
      if (account?.providerAccountId) token.uid = account.providerAccountId;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});
