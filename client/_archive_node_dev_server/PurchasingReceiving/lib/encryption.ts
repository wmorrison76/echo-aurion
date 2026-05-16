/** * Server-side encryption utilities * Handles KMS key management and encryption/decryption operations * Keeps sensitive keys server-side only (never exposed to client) */ import crypto from 'crypto';
import { logger } from './logger'; /** * Encryption key configuration * In production, this would be retrieved from a KMS service (AWS KMS, Google Cloud KMS, etc.) */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.VITE_PAYMENT_ENCRYPTION_KEY; if (!ENCRYPTION_KEY) { logger.warn("⚠️ ENCRYPTION_KEY not set - encryption will use default key");
} /** * Derive encryption key from config key * Uses SHA-256 to create a 32-byte key for AES-256 */
function deriveKey(masterKey: string): Buffer { return crypto.createHash('sha256').update(masterKey).digest();
} /** * Encrypt data with AES-256-GCM * Returns { encryptedData, iv, authTag } as base64 strings */
export function encryptData(plaintext: string, keyOverride?: string): { encryptedData: string; iv: string; authTag: string; algorithm: string;
} { try { const key = deriveKey(keyOverride || ENCRYPTION_KEY || 'default-key'); const iv = crypto.randomBytes(16); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); let encryptedData = cipher.update(plaintext, 'utf8', 'hex'); encryptedData += cipher.final('hex'); const authTag = cipher.getAuthTag(); logger.debug("Data encrypted successfully"); return { encryptedData, iv: iv.toString('base64'), authTag: authTag.toString('base64'), algorithm: 'aes-256-gcm', }; } catch (error) { logger.error("Encryption failed", { error }); throw error; }
} /** * Decrypt data encrypted with AES-256-GCM */
export function decryptData( encryptedData: string, iv: string, authTag: string, keyOverride?: string
): string { try { const key = deriveKey(keyOverride || ENCRYPTION_KEY || 'default-key'); const decipher = crypto.createDecipheriv( 'aes-256-gcm', key, Buffer.from(iv, 'base64') ); decipher.setAuthTag(Buffer.from(authTag, 'base64')); let plaintext = decipher.update(encryptedData, 'hex', 'utf8'); plaintext += decipher.final('utf8'); logger.debug("Data decrypted successfully"); return plaintext; } catch (error) { logger.error("Decryption failed", { error }); throw error; }
} /** * Hash sensitive data (one-way, for comparison) */
export function hashData(data: string): string { return crypto.createHash('sha256').update(data).digest('hex');
} /** * Encrypt payment card info for storage * Returns minimal sensitive data encrypted */
export function encryptPaymentCard(cardInfo: { lastFour: string; brand: string; expiryMonth: number; expiryYear: number;
}): string { try { const payload = JSON.stringify({ lastFour: cardInfo.lastFour, brand: cardInfo.brand, expiry: `${cardInfo.expiryMonth}/${cardInfo.expiryYear}`, encryptedAt: new Date().toISOString(), }); const encrypted = encryptData(payload); // Return as combined string for storage return `${encrypted.iv}:${encrypted.authTag}:${encrypted.encryptedData}`; } catch (error) { logger.error("Payment card encryption failed", { error }); throw error; }
} /** * Decrypt payment card info */
export function decryptPaymentCard( encrypted: string
): { lastFour: string; brand: string; expiry: string; encryptedAt: string;
} { try { const [iv, authTag, encryptedData] = encrypted.split(':'); const plaintext = decryptData(encryptedData, iv, authTag); return JSON.parse(plaintext); } catch (error) { logger.error("Payment card decryption failed", { error }); throw error; }
} /** * Generate a cryptographically secure random token */
export function generateSecureToken(length: number = 32): string { return crypto.randomBytes(length).toString('hex');
} /** * Verify KMS is properly configured */
export function isEncryptionConfigured(): boolean { return !!(ENCRYPTION_KEY && ENCRYPTION_KEY !== 'default-key');
} /** * Get encryption status for logging */
export function getEncryptionStatus(): { configured: boolean; algorithm: string; keySource: string;
} { return { configured: isEncryptionConfigured(), algorithm: 'aes-256-gcm', keySource: ENCRYPTION_KEY ? 'ENCRYPTION_KEY env' : 'VITE_PAYMENT_ENCRYPTION_KEY env (fallback)', };
}
