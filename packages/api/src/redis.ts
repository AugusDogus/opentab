import { Realtime } from "@upstash/realtime";
import { Redis } from "@upstash/redis";
import { z } from "zod";

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
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const redis = new Redis({ url, token });
  return new Realtime({ schema, redis });
};

let realtimeInstance: RealtimeInstance = null;

export const getRealtime = (): RealtimeInstance => {
  if (!realtimeInstance) {
    realtimeInstance = createRealtime();
  }
  return realtimeInstance;
};

export const emitTabEvent = async (
  deviceId: string,
  tab: { id: string; url: string; title: string | null },
): Promise<boolean> => {
  const realtime = getRealtime();
  if (!realtime) return false;

  await realtime.channel(`device-${deviceId}`).emit("tab.new", tab);
  return true;
};

export const isRedisConfigured = (): boolean => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

export { schema };
