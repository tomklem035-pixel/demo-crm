import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required");
}

async function refreshAccessToken(token: any) {
  const tenantId = process.env.AZURE_AD_TENANT_ID ?? "common";
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      scope: "openid email profile offline_access Contacts.Read Mail.Read Calendars.Read",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  return {
    ...token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? token.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    error: undefined,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
      authorization: {
        params: {
          scope:
            "openid email profile offline_access Contacts.Read Mail.Read Calendars.Read",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }
      // Return token as-is if not yet expired (5 min buffer)
      if (
        typeof token.expiresAt === "number" &&
        Date.now() < token.expiresAt * 1000 - 5 * 60 * 1000
      ) {
        return token;
      }
      // Refresh the token
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
    async signIn({ profile }) {
      const allowed = process.env.ALLOWED_EMAIL;
      if (!allowed) return true;
      const email = profile?.email ?? (profile as any)?.preferred_username;
      if (!email) return false;
      return email.toLowerCase() === allowed.toLowerCase();
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
