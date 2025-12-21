import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    PORT: z.coerce.number().default(3000),
    BETTER_AUTH_SECRET: z.string().min(1),
    // The public URL where the server is accessible (e.g., https://local.augie.haus for Cloudflare Tunnel)
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    // Optional: specific Chrome extension ID for production (more secure than wildcard)
    CHROME_EXTENSION_ID: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
