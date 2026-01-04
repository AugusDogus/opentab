import { useQuery } from "@tanstack/react-query";

import { tabsQuery } from "~/lib/device-storage";

export function useCurrentTab() {
  const { data: currentTab = null } = useQuery({
    queryKey: ["currentTab"],
    queryFn: async () => {
      const tabs = await tabsQuery({ active: true, currentWindow: true });
      return tabs[0] ?? null;
    },
    staleTime: Infinity,
  });

  return currentTab;
}
