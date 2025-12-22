import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { x25519 } from "@noble/curves/ed25519";

/**
 * Key pair for X25519 key exchange
 */
export type KeyPair = {
  readonly publicKey: string; // Hex encoded
  readonly secretKey: string; // Hex encoded
};

/**
 * Encrypted payload containing ciphertext and metadata needed for decryption
 */
export type EncryptedPayload = {
  readonly ciphertext: string; // Hex encoded
  readonly nonce: string; // Hex encoded (12 bytes for GCM)
  readonly senderPublicKey: string; // Hex encoded
};

/**
 * Tab data to be encrypted
 */
export type TabData = {
  readonly url: string;
  readonly title?: string;
};

/**
 * Convert a Uint8Array to hex string
 */
const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Convert a hex string to Uint8Array
 */
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/**
 * Generate a new X25519 key pair for ECDH key exchange
 * @returns Key pair with public and secret keys as hex strings
 */
export const generateKeyPair = (): KeyPair => {
  const secretKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(secretKey);

  return {
    publicKey: bytesToHex(publicKey),
    secretKey: bytesToHex(secretKey),
  };
};

/**
 * Derive a shared secret using X25519 ECDH
 * @param recipientPublicKey - Recipient's public key (hex)
 * @param senderSecretKey - Sender's secret key (hex)
 * @returns Shared secret as Uint8Array (32 bytes)
 */
const deriveSharedSecret = (recipientPublicKey: string, senderSecretKey: string): Uint8Array =>
  x25519.getSharedSecret(hexToBytes(senderSecretKey), hexToBytes(recipientPublicKey));

/**
 * Encrypt data for a specific device using X25519 key exchange + AES-256-GCM
 * @param plaintext - Data to encrypt (will be JSON stringified)
 * @param recipientPublicKey - Recipient's public key (hex)
 * @param senderSecretKey - Sender's secret key (hex)
 * @param senderPublicKey - Sender's public key (hex)
 * @returns Encrypted payload
 */
export const encryptForDevice = (
  data: TabData,
  recipientPublicKey: string,
  senderSecretKey: string,
  senderPublicKey: string,
): EncryptedPayload => {
  const plaintext = JSON.stringify(data);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Derive shared secret using ECDH
  const sharedSecret = deriveSharedSecret(recipientPublicKey, senderSecretKey);

  // Generate random 12-byte nonce for GCM
  const nonce = randomBytes(12);

  // Encrypt with AES-256-GCM
  const cipher = gcm(sharedSecret, nonce);
  const ciphertext = cipher.encrypt(plaintextBytes);

  return {
    ciphertext: bytesToHex(ciphertext),
    nonce: bytesToHex(nonce),
    senderPublicKey,
  };
};

/**
 * Decrypt data received from another device
 * @param encryptedPayload - The encrypted payload
 * @param recipientSecretKey - Recipient's secret key (hex)
 * @returns Decrypted tab data
 * @throws Error if decryption fails
 */
export const decryptFromDevice = (
  encryptedPayload: EncryptedPayload,
  recipientSecretKey: string,
): TabData => {
  const { ciphertext, nonce, senderPublicKey } = encryptedPayload;

  // Derive shared secret using ECDH (same result as sender due to ECDH properties)
  const sharedSecret = deriveSharedSecret(senderPublicKey, recipientSecretKey);

  // Decrypt with AES-256-GCM
  const cipher = gcm(sharedSecret, hexToBytes(nonce));
  const plaintextBytes = cipher.decrypt(hexToBytes(ciphertext));

  const plaintext = new TextDecoder().decode(plaintextBytes);
  return JSON.parse(plaintext) as TabData;
};

/**
 * Encrypt tab data for multiple devices
 * @param data - Tab data to encrypt
 * @param devices - Array of devices with their public keys
 * @param senderSecretKey - Sender's secret key (hex)
 * @param senderPublicKey - Sender's public key (hex)
 * @returns Array of encrypted payloads with target device IDs
 */
export const encryptForDevices = (
  data: TabData,
  devices: ReadonlyArray<{ readonly id: string; readonly publicKey: string }>,
  senderSecretKey: string,
  senderPublicKey: string,
): ReadonlyArray<{ readonly deviceId: string; readonly encrypted: EncryptedPayload }> =>
  devices.map((device) => ({
    deviceId: device.id,
    encrypted: encryptForDevice(data, device.publicKey, senderSecretKey, senderPublicKey),
  }));

/**
 * Serialize encrypted payload for transport/storage
 */
export const serializeEncryptedPayload = (payload: EncryptedPayload): string =>
  JSON.stringify(payload);

/**
 * Deserialize encrypted payload from transport/storage
 */
export const deserializeEncryptedPayload = (serialized: string): EncryptedPayload =>
  JSON.parse(serialized) as EncryptedPayload;
