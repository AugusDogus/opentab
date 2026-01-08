import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { env } from "~/lib/env";

const SCHEME = "opentab";

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    expoClient({
      scheme: SCHEME,
      storagePrefix: SCHEME,
      storage: SecureStore,
    }),
  ],
});
