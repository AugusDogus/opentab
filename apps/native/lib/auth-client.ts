import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { env } from "~/lib/env";

// Use hardcoded scheme to avoid issues with Constants.expoConfig being undefined in some contexts
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
