import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { env } from "~/lib/env";

const SCHEME = "opentab";
const TOKEN_KEY = `${SCHEME}_bearer_token`;

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    expoClient({
      scheme: SCHEME,
      storagePrefix: SCHEME,
      storage: SecureStore,
    }),
  ],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => SecureStore.getItem(TOKEN_KEY) ?? "",
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        SecureStore.setItem(TOKEN_KEY, authToken);
      }
    },
  },
});

export async function clearBearerToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
