import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@opentab/api/context";
import { appRouter } from "@opentab/api/routers/index";
import { initAuth } from "@opentab/auth";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { env } from "./env";

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

// Auth success page - shown after OAuth callback
app.get("/auth/success", async (c) => {
  const html = await Bun.file(
    new URL("../public/auth-success.html", import.meta.url).pathname
  ).text();
  return c.html(html);
});

// Export for Bun (local dev) and Vercel (serverless)
export default {
  port: env.PORT,
  fetch: app.fetch,
};
