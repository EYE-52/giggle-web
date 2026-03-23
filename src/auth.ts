import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [Google],
  callbacks: {
    async session({ session, user }) {
      // Add the MongoDB User ID to the session so we can pass it to Socket.io later
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});