import crypto from "crypto";

/**
 * Encrypt sensitive data before storage
 * Uses AES-256-GCM encryption with a derived key from ENCRYPTION_KEY env var
 */
export class SecretsManager {
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY || process.env.SECRET_KEY;
    if (!key) {
      console.warn(
        "⚠️  ENCRYPTION_KEY not set. Secrets will not be encrypted. Set ENCRYPTION_KEY for production.",
      );
    }
    // Derive 32-byte key from provided key (or use a default for dev)
    this.encryptionKey = crypto
      .createHash("sha256")
      .update(key || "dev-key")
      .digest();
  }

  /**
   * Encrypt a secret value
   * Returns base64-encoded: iv + ciphertext + authTag
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Combine: iv (12 bytes) + ciphertext + authTag (16 bytes)
    const combined = Buffer.concat([iv, Buffer.from(encrypted, "hex"), authTag]);
    return combined.toString("base64");
  }

  /**
   * Decrypt a secret value
   */
  decrypt(encrypted: string): string {
    try {
      const combined = Buffer.from(encrypted, "base64");

      // Extract components
      const iv = combined.slice(0, 12);
      const authTag = combined.slice(combined.length - 16);
      const ciphertext = combined.slice(12, combined.length - 16);

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error("Failed to decrypt secret: Invalid or corrupted data");
    }
  }

  /**
   * Hash a secret (one-way) for comparison
   */
  hash(plaintext: string): string {
    return crypto.createHash("sha256").update(plaintext).digest("hex");
  }

  /**
   * Verify a plaintext against a hash
   */
  verify(plaintext: string, hash: string): boolean {
    return this.hash(plaintext) === hash;
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }
}

// Singleton instance
let instance: SecretsManager | null = null;

export function getSecretsManager(): SecretsManager {
  if (!instance) {
    instance = new SecretsManager();
  }
  return instance;
}

/**
 * Helper: Do NOT return encrypted secrets in API responses
 * Always return only the encrypted flag or null
 * Clients must retrieve secrets via secure channels
 */
export function sanitizeSecretFromResponse(obj: any): any {
  if (!obj) return obj;

  const sanitized = { ...obj };
  const sensitiveFields = [
    "client_secret",
    "webhook_secret",
    "api_secret",
    "access_token",
    "refresh_token",
    "secret",
    "password",
    "private_key",
    "encryption_key",
    "backup_codes",
    "otp_secret",
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = null;
    }
  }

  return sanitized;
}
