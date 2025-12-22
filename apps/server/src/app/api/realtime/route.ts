import { handle } from "@upstash/realtime";

import { getRealtime } from "~/lib/realtime";

export const maxDuration = 300;

export const GET = (request: Request) => {
  const realtime = getRealtime();
  if (!realtime) {
    return new Response("Realtime not configured", { status: 503 });
  }

  return handle({ realtime })(request);
};
