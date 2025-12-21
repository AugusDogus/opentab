import { createAuthClient } from "better-auth/react";

import { env } from "~env";

export const authClient = createAuthClient({
  baseURL: env.PLASMO_PUBLIC_SERVER_URL,
  plugins: [],
});
