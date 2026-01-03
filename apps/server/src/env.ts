import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    APPLE_CLIENT_ID: z.string().min(1),
    APPLE_CLIENT_SECRET: z.string().min(1),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    CHROME_EXTENSION_ID: z.string().optional(),
    // Upstash Redis for real-time pub/sub
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Vercel system env vars
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  skipValidation: !!process.env.CI,
});
