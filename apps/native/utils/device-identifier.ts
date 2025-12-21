import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";

export const getDeviceIdentifier = async (): Promise<string> => {
  // Try to get stored identifier first
  const stored = await SecureStore.getItemAsync(DEVICE_IDENTIFIER_KEY);
  if (stored) {
    return stored;
  }

  // Generate a new identifier based on platform
  let baseId: string;
  if (Platform.OS === "android") {
    const androidId = await Application.getAndroidId();
    baseId = androidId ?? Crypto.randomUUID();
  } else {
    baseId = Crypto.randomUUID();
  }

  // Don't include device name in identifier - it can change if user renames device
  const newId = `mobile-${Platform.OS}-${baseId}`;

  // Persist the identifier
  await SecureStore.setItemAsync(DEVICE_IDENTIFIER_KEY, newId);
  return newId;
};
