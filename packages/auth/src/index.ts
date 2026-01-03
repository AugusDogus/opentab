import { expo } from "@better-auth/expo";
import { db } from "@opentab/db";
import * as schema from "@opentab/db/schema/auth";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

export function initAuth(options: {
  baseUrl: string;
  extensionId?: string;
  productionUrl?: string;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    baseURL: options.baseUrl,
    trustedOrigins: [
      // Expo deep link schemes (exp:// for Expo Go, opentab:// for standalone builds)
      "exp://",
      "opentab://",
      // Chrome extension (use specific ID in production, wildcard for dev)
      options.extensionId ? `chrome-extension://${options.extensionId}` : "chrome-extension://*",
      // Allow the server's own URL for redirects
      options.baseUrl,
      // Apple Sign In
      "https://appleid.apple.com",
    ],
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        redirectURI: options.productionUrl
          ? `${options.productionUrl}/api/auth/callback/github`
          : undefined,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
        appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
        redirectURI: options.productionUrl
          ? `${options.productionUrl}/api/auth/callback/apple`
          : undefined,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: options.productionUrl
          ? `${options.productionUrl}/api/auth/callback/google`
          : undefined,
      },
    },
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [expo(), oAuthProxy()],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
