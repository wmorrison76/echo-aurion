/**
 * Encrypt/decrypt integration credentials (API keys, tokens) for storage.
 * Use INTEGRATION_ENCRYPTION_KEY (32-byte hex) in env. If unset, returns null (no encryption).
 */

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer | null {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) return null;
  return Buffer.from(raw, "hex");
}

export function encryptCredentials(plain: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptCredentials(encrypted: string): string | null {
  const key = getKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(encrypted, "base64");
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return null;
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final("utf8");
  } catch {
    return null;
  }
}

export function hasEncryptionKey(): boolean {
  return getKey() !== null;
}
