import { useEffect, useState } from "react";

import { getDeviceIdentifier } from "@/utils/device-identifier";

export const useDeviceIdentifier = (): string => {
  const [deviceIdentifier, setDeviceIdentifier] = useState<string>("");

  useEffect(() => {
    getDeviceIdentifier().then(setDeviceIdentifier);
  }, []);

  return deviceIdentifier;
};
