import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { initAuth } from "@opentab/auth";

import { env } from "~/env";

const getBaseUrl = () => {
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return env.BETTER_AUTH_URL ?? "http://localhost:3000";
};

export const auth = initAuth({
  baseUrl: getBaseUrl(),
  extensionId: env.CHROME_EXTENSION_ID,
});

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
