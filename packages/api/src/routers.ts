import { deviceRouter } from "./device-router";
import { protectedProcedure, publicProcedure, router } from "./index";
import { tabRouter } from "./tab-router";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  device: deviceRouter,
  tab: tabRouter,
});

export type AppRouter = typeof appRouter;
