import { createAuthClient } from "better-auth/react";

import { env } from "~/env";

const TOKEN_KEY = "opentab_bearer_token";

export const authClient = createAuthClient({
  baseURL: env.PLASMO_PUBLIC_SERVER_URL,
  plugins: [],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem(TOKEN_KEY) ?? "",
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        localStorage.setItem(TOKEN_KEY, authToken);
      }
    },
  },
});

export function clearBearerToken() {
  localStorage.removeItem(TOKEN_KEY);
}
