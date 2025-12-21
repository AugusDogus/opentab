import * as Application from "expo-application";
import Constants from "expo-constants";
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
  const baseId =
    Platform.OS === "android"
      ? (Application.getAndroidId() ?? crypto.randomUUID())
      : crypto.randomUUID();

  const deviceName = Constants.deviceName ?? "unknown";
  const newId = `mobile-${Platform.OS}-${baseId}-${deviceName}`;

  // Persist the identifier
  await SecureStore.setItemAsync(DEVICE_IDENTIFIER_KEY, newId);
  return newId;
};
