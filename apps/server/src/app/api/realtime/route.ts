/**
 * TODO: Remove patch when @upstash/realtime merges PR #9
 * @see https://github.com/upstash/realtime/pull/9
 * @see https://github.com/upstash/realtime/issues/5
 *
 * We patch @upstash/realtime to separate client pings from Redis pings,
 * reducing Vercel Fluid Compute CPU usage. Once the PR is merged and
 * released, remove the patch from patches/@upstash%2Frealtime@1.0.0.patch
 * and update the package.
 */
import { handle } from "@upstash/realtime";

import { getRealtime } from "@opentab/api/redis";

export const maxDuration = 300;

export const GET = (request: Request) => {
  const realtime = getRealtime();
  if (!realtime) {
    return new Response("Realtime not configured", { status: 503 });
  }

  return handle({ realtime })(request);
};
