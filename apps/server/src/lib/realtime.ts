import { Realtime } from "@upstash/realtime";
import { Redis } from "@upstash/redis";
import { z } from "zod";

import { env } from "~/env";

const schema = {
  tab: {
    new: z.object({
      id: z.string(),
      url: z.string(),
      title: z.string().nullable(),
    }),
  },
};

type RealtimeInstance = ReturnType<typeof createRealtime>;

const createRealtime = () => {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return new Realtime({ schema, redis });
};

let realtimeInstance: RealtimeInstance = null;

export const getRealtime = (): NonNullable<RealtimeInstance> | null => {
  if (!realtimeInstance) {
    realtimeInstance = createRealtime();
  }
  return realtimeInstance;
};

export type RealtimeEvents = {
  "tab.new": z.infer<typeof schema.tab.new>;
};
