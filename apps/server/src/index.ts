import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@opentab/api/context";
import { appRouter } from "@opentab/api/routers/index";
import { initAuth } from "@opentab/auth";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { env } from "./env";

import authSuccessPage from "../public/auth-success.html";

const auth = initAuth({
  baseUrl: env.BETTER_AUTH_URL,
  extensionId: env.CHROME_EXTENSION_ID,
});

const app = new Hono();

app.use(logger());

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context, auth });
    },
  }),
);

// Use Bun.serve with routes for HTML pages + Hono for API
const server = Bun.serve({
  port: env.PORT,
  
  // HTML routes with Tailwind (bundled by Bun)
  routes: {
    // Auth success page - shown after OAuth callback
    "/auth/success": authSuccessPage,
  },
  
  development: process.env.NODE_ENV !== "production",
  
  // Fallback to Hono for all other routes
  fetch: app.fetch,
});

console.log(`Started development server: ${server.url}`);
