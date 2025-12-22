import {
  encryptForDevices,
  generateKeyPair,
  serializeEncryptedPayload,
  type KeyPair,
  type TabData,
} from "@opentab/crypto";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

const SECRET_KEY_STORAGE_KEY = "opentab_secret_key";
const PUBLIC_KEY_STORAGE_KEY = "opentab_public_key";

type EncryptionKeysState = {
  readonly publicKey: string | null;
  readonly secretKey: string | null;
  readonly isLoading: boolean;
};

type TargetDevice = {
  readonly id: string;
  readonly publicKey: string;
};

/**
 * Hook for managing E2E encryption keys
 * - Generates key pair on first launch
 * - Stores secret key in expo-secure-store
 * - Provides helper to encrypt data for multiple devices
 */
export const useEncryptionKeys = () => {
  const [state, setState] = useState<EncryptionKeysState>({
    publicKey: null,
    secretKey: null,
    isLoading: true,
  });

  // Load or generate keys on mount
  useEffect(() => {
    const initializeKeys = async () => {
      const existingSecretKey = await SecureStore.getItemAsync(SECRET_KEY_STORAGE_KEY);
      const existingPublicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);

      if (existingSecretKey && existingPublicKey) {
        setState({
          publicKey: existingPublicKey,
          secretKey: existingSecretKey,
          isLoading: false,
        });
        return;
      }

      // Generate new key pair
      const keyPair: KeyPair = generateKeyPair();

      // Store keys securely
      await SecureStore.setItemAsync(SECRET_KEY_STORAGE_KEY, keyPair.secretKey);
      await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);

      setState({
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
        isLoading: false,
      });
    };

    initializeKeys();
  }, []);

  /**
   * Encrypt tab data for multiple target devices
   * Returns array of encrypted payloads ready for API submission
   */
  const encryptForTargetDevices = useCallback(
    (data: TabData, targetDevices: readonly TargetDevice[]) => {
      if (!state.secretKey || !state.publicKey) {
        throw new Error("Encryption keys not initialized");
      }

      const encryptedPayloads = encryptForDevices(
        data,
        targetDevices,
        state.secretKey,
        state.publicKey,
      );

      return encryptedPayloads.map((payload) => ({
        targetDeviceId: payload.deviceId,
        encryptedData: serializeEncryptedPayload(payload.encrypted),
      }));
    },
    [state.secretKey, state.publicKey],
  );

  return {
    publicKey: state.publicKey,
    secretKey: state.secretKey,
    isLoading: state.isLoading,
    encryptForTargetDevices,
  };
};
