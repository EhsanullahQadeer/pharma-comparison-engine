import type { DiscoverySourceType } from "@/generated/prisma/client";
import { decryptCredentials, encryptCredentials } from "@/lib/discovery/credentials-crypto";
import { discoverySourceCredentialFields } from "@/lib/discovery-credential-fields";

export type CredentialUpdate = { credentialsCiphertext: string | null; configuredCredentialKeys: string[] };

// Reads "cred_<key>" fields from a submitted form and merges any non-blank ones over the existing
// stored credentials (decrypted once, re-encrypted once). Returns null when nothing was actually
// submitted — callers then leave credentialsCiphertext/configuredCredentialKeys untouched, so
// editing just cadence/enabled never requires DISCOVERY_CREDENTIALS_ENCRYPTION_KEY to be configured
// or a previously-stored blob to still be decryptable. A blank field means "keep the existing
// value," never "clear it" — clearing isn't exposed in this slice.
export function resolveCredentialUpdate(
  type: DiscoverySourceType,
  formData: FormData,
  existingCiphertext: string | null,
): CredentialUpdate | null {
  const fields = discoverySourceCredentialFields[type];
  if (fields.length === 0) return null;

  const submitted: Record<string, string> = {};
  for (const { key } of fields) {
    const raw = formData.get(`cred_${key}`);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) submitted[key] = value;
  }
  if (Object.keys(submitted).length === 0) return null;

  let existing: Record<string, string> = {};
  if (existingCiphertext) {
    try {
      existing = decryptCredentials(existingCiphertext);
    } catch {
      // An undecryptable old blob (e.g. after a key rotation) is treated as empty rather than
      // blocking the admin from setting fresh credentials.
      existing = {};
    }
  }

  const merged = { ...existing, ...submitted };
  const configuredCredentialKeys = Object.keys(merged).filter((key) => merged[key]);

  return {
    credentialsCiphertext: configuredCredentialKeys.length > 0 ? encryptCredentials(merged) : null,
    configuredCredentialKeys,
  };
}
