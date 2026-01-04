import { useQuery } from "@tanstack/react-query";

import { getDeviceIdentifier } from "~/lib/device-storage";
import { queryClient, trpcClient } from "~/lib/trpc";

export function useDeviceRegistration() {
  const { data: deviceIdentifier = "" } = useQuery({
    queryKey: ["deviceIdentifier"],
    queryFn: getDeviceIdentifier,
    staleTime: Infinity,
  });

  useQuery({
    queryKey: ["deviceRegistration", deviceIdentifier],
    queryFn: async () => {
      const result = await trpcClient.device.register.mutate({
        deviceType: "browser_extension",
        deviceName: "Chrome Extension",
        deviceIdentifier,
      });
      queryClient.invalidateQueries({ queryKey: [["device", "list"]] });
      return result;
    },
    enabled: !!deviceIdentifier,
    staleTime: Infinity,
    retry: false,
  });

  return { deviceIdentifier };
}
