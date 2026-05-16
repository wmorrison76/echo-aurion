import crypto from "crypto";
import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface EncryptedSnapshot {
  data: Buffer;
  iv: string; // hex
  authTag: string; // hex
  salt: string; // hex
  algorithm: string;
  compression: string;
}

export interface DecryptionResult {
  data: Buffer;
  metadata: {
    created: Date;
    size: number;
    checksum: string;
  };
}

class SnapshotEncryptionService {
  private readonly ALGORITHM = "aes-256-gcm";
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly SALT_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly PBKDF2_ITERATIONS = 100000;

  /**
   * Encrypt snapshot data with password
   */
  async encryptSnapshot(
    data: Buffer,
    password: string
  ): Promise<EncryptedSnapshot> {
    try {
      // Generate random salt
      const salt = crypto.randomBytes(this.SALT_LENGTH);

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Compress data
      const compressed = await gzip(data);

      // Generate random IV
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(compressed),
        cipher.final(),
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      return {
        data: encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        salt: salt.toString("hex"),
        algorithm: this.ALGORITHM,
        compression: "gzip",
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt snapshot");
    }
  }

  /**
   * Decrypt snapshot data with password
   */
  async decryptSnapshot(
    encryptedSnapshot: EncryptedSnapshot,
    password: string
  ): Promise<DecryptionResult> {
    try {
      // Validate algorithm
      if (encryptedSnapshot.algorithm !== this.ALGORITHM) {
        throw new Error("Unsupported encryption algorithm");
      }

      // Convert hex strings back to buffers
      const salt = Buffer.from(encryptedSnapshot.salt, "hex");
      const iv = Buffer.from(encryptedSnapshot.iv, "hex");
      const authTag = Buffer.from(encryptedSnapshot.authTag, "hex");

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        key,
        iv
      );

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encryptedSnapshot.data),
        decipher.final(),
      ]);

      // Decompress
      const decompressed = await gunzip(decrypted);

      // Calculate checksum
      const checksum = crypto
        .createHash("sha256")
        .update(decompressed)
        .digest("hex");

      return {
        data: decompressed,
        metadata: {
          created: new Date(),
          size: decompressed.length,
          checksum,
        },
      };
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt snapshot");
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      "sha256"
    );
  }

  /**
   * Generate password for unattended encryption
   */
  generateSecurePassword(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash password for storage (one-way)
   */
  hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  /**
   * Validate password checksum
   */
  validatePassword(password: string, hash: string): boolean {
    const computed = this.hashPassword(password);
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hash)
    );
  }

  /**
   * Create snapshot archive with metadata
   */
  async createSnapshot(
    files: Record<string, Buffer>,
    metadata: Record<string, any>,
    password?: string
  ): Promise<Buffer> {
    try {
      const usePassword = password || this.generateSecurePassword();

      // Create TAR-like structure
      const archive: Record<string, any> = {
        metadata: {
          ...metadata,
          created: new Date().toISOString(),
          version: "1.0",
        },
        files,
      };

      const archiveJson = JSON.stringify(archive);
      const archiveBuffer = Buffer.from(archiveJson);

      // Encrypt
      const encrypted = await this.encryptSnapshot(archiveBuffer, usePassword);

      // Create final package
      const finalPackage = {
        version: "1.0",
        algorithm: encrypted.algorithm,
        compression: encrypted.compression,
        salt: encrypted.salt,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        data: encrypted.data.toString("base64"),
      };

      return Buffer.from(JSON.stringify(finalPackage));
    } catch (error) {
      console.error("Snapshot creation error:", error);
      throw new Error("Failed to create snapshot");
    }
  }

  /**
   * Restore snapshot archive
   */
  async restoreSnapshot(
    archiveBuffer: Buffer,
    password: string
  ): Promise<{ metadata: Record<string, any>; files: Record<string, Buffer> }> {
    try {
      const finalPackage = JSON.parse(archiveBuffer.toString());

      // Validate version
      if (finalPackage.version !== "1.0") {
        throw new Error("Unsupported snapshot version");
      }

      // Decrypt
      const decrypted = await this.decryptSnapshot(
        {
          data: Buffer.from(finalPackage.data, "base64"),
          algorithm: finalPackage.algorithm,
          compression: finalPackage.compression,
          salt: finalPackage.salt,
          iv: finalPackage.iv,
          authTag: finalPackage.authTag,
        },
        password
      );

      // Parse archive
      const archive = JSON.parse(decrypted.data.toString());

      return {
        metadata: archive.metadata,
        files: archive.files,
      };
    } catch (error) {
      console.error("Snapshot restore error:", error);
      throw new Error("Failed to restore snapshot");
    }
  }

  /**
   * Verify snapshot integrity
   */
  async verifySnapshot(
    archiveBuffer: Buffer,
    password: string
  ): Promise<{ valid: boolean; checksum: string }> {
    try {
      const decrypted = await this.decryptSnapshot(
        JSON.parse(archiveBuffer.toString()).encryptedData,
        password
      );

      return {
        valid: true,
        checksum: decrypted.metadata.checksum,
      };
    } catch (error) {
      console.error("Snapshot verification error:", error);
      return {
        valid: false,
        checksum: "",
      };
    }
  }

  /**
   * Estimate snapshot size after compression
   */
  async estimateSize(data: Buffer): Promise<number> {
    try {
      const compressed = await gzip(data);
      // Add overhead for encryption (IV, salt, auth tag, headers)
      const overhead =
        this.IV_LENGTH +
        this.SALT_LENGTH +
        this.AUTH_TAG_LENGTH +
        256; // JSON overhead
      return compressed.length + overhead;
    } catch (error) {
      return data.length;
    }
  }
}

export const snapshotEncryptionService = new SnapshotEncryptionService();
