import { handle } from "@upstash/realtime";

import { getRealtime } from "~/lib/realtime";

// Match timeout to realtime config (5 minutes for Vercel)
export const maxDuration = 300;

export const GET = (request: Request) => {
  const realtime = getRealtime();

  if (!realtime) {
    return new Response("Realtime not configured", { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return handle({ realtime: realtime as any })(request);
};
