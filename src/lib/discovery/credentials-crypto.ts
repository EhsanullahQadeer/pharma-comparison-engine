import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

// Thrown when DISCOVERY_CREDENTIALS_ENCRYPTION_KEY is missing/malformed, or a stored blob can't be
// decrypted with the current key (e.g. after a key rotation) — never silently falls back to
// treating credentials as absent from encrypt/decrypt callers that need to know which happened.
export class DiscoveryCredentialsCryptoError extends Error {}

function getKey(): Buffer {
  const raw = process.env.DISCOVERY_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new DiscoveryCredentialsCryptoError(
      "DISCOVERY_CREDENTIALS_ENCRYPTION_KEY is not configured — generate one with " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" and set it before storing discovery-source credentials.`,
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new DiscoveryCredentialsCryptoError(`DISCOVERY_CREDENTIALS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}).`);
  }
  return key;
}

// Serialized as "<iv>:<authTag>:<ciphertext>", each segment base64 — never plaintext, never logged.
export function encryptCredentials(data: Record<string, string>): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(":");
}

export function decryptCredentials(ciphertext: string): Record<string, string> {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new DiscoveryCredentialsCryptoError("Stored credentials blob is malformed.");
  }
  const [ivB64, authTagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  let plaintext: string;
  try {
    plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new DiscoveryCredentialsCryptoError("Could not decrypt stored credentials — the encryption key may have changed.");
  }

  return JSON.parse(plaintext) as Record<string, string>;
}
