import { z } from "zod";

const serverUrlSchema = z.string().url();

// EXPO_PUBLIC_* vars are inlined by Expo at build time
const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;

if (!serverUrl) {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not set");
}

export const env = {
  EXPO_PUBLIC_SERVER_URL: serverUrlSchema.parse(serverUrl),
};
