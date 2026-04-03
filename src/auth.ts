import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import { AUTH_EXCHANGE_ENDPOINT } from "@/config/appConfig";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [Google],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        try {
          const res = await fetch(AUTH_EXCHANGE_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });

          const data = await res.json();
          token.backendToken = data.token;
          token.userId = data.user?.id;
        } catch (err) {
          console.error("Auth exchange failed:", err);
        }
      }
    console.log("JWT TOKEN:", token);

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.backendToken = token.backendToken;

        session.user.id = token.userId || token.sub;
      }
      console.log("FINAL SESSION:", session);
      return session;
    },
  },
});