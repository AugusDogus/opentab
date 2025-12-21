import { useEffect, useState } from "react";

import { getDeviceIdentifier } from "@/utils/device-identifier";

type UseDeviceIdentifierResult = {
  deviceIdentifier: string | null;
  isLoading: boolean;
  error: Error | null;
};

export const useDeviceIdentifier = (): UseDeviceIdentifierResult => {
  const [deviceIdentifier, setDeviceIdentifier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getDeviceIdentifier()
      .then((id) => {
        setDeviceIdentifier(id);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, []);

  return { deviceIdentifier, isLoading, error };
};
