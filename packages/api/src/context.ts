import type { Auth } from "@opentab/auth";

export type CreateContextOptions = {
  auth: Auth;
  headers: Headers;
};

export async function createContext({ auth, headers }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
