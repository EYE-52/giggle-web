import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { AUTH_EXCHANGE_ENDPOINT } from "@/config/appConfig";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
              ...(process.env.AUTH_EXCHANGE_SECRET
                ? { "x-giggle-auth-exchange-secret": process.env.AUTH_EXCHANGE_SECRET }
                : {}),
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });

          const data = await res.json();

          if (!res.ok || data?.ok === false) {
            throw new Error(`Auth exchange failed (${res.status}): ${data?.error?.message || "Unknown backend error"}`);
          }

          if (!data?.token || !data?.user?.id) {
            throw new Error("Auth exchange response missing token or user");
          }

          token.backendToken = data.token;
          token.userId = data.user?.id;
          token.isPremium = data.user?.isPremium;
          token.isApproved = data.user?.isApproved;
        } catch (err) {
          console.error("Auth exchange failed:", err);
          throw err;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.backendToken = token.backendToken;

        session.user.id = token.userId || token.sub;
        session.user.isPremium = token.isPremium || false;
        session.user.isApproved = token.isApproved || false;
      }
      return session;
    },
  },
});
