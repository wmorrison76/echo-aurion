/**
 * AEGIS Guardian
 * Data Protection & Encryption
 * Military-grade encryption and data loss prevention
 */

import crypto from 'crypto';
import { DataAccessRecord, EncryptionConfig } from '../../../shared/types/security';
import { UUID } from '../../../shared/types/base';

/**
 * Sensitive data patterns
 */
const SENSITIVE_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  apiKey: /\b[A-Za-z0-9]{32,}\b/g
};

/**
 * AEGIS Guardian - Data Protection
 */
export class AegisGuardian {
  private encryptionKey: Buffer;
  private config: EncryptionConfig;
  private dataAccessLog: DataAccessRecord[] = [];
  
  constructor() {
    // Generate encryption key (in production, load from secure key management service)
    this.encryptionKey = crypto.randomBytes(32);
    
    this.config = {
      algorithm: 'AES-256-GCM',
      keyRotationDays: 90,
      enforceAtRest: true,
      enforceInTransit: true,
      enforceEndToEnd: true
    };
  }
  
  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  /**
   * Decrypt data
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Scan data for sensitive information
   */
  scanForSensitiveData(data: string): {
    hasSensitiveData: boolean;
    types: string[];
    matches: number;
  } {
    const types: string[] = [];
    let totalMatches = 0;
    
    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      const matches = data.match(pattern);
      if (matches && matches.length > 0) {
        types.push(type);
        totalMatches += matches.length;
      }
    }
    
    return {
      hasSensitiveData: types.length > 0,
      types,
      matches: totalMatches
    };
  }
  
  /**
   * Redact sensitive data
   */
  redactSensitiveData(data: string): string {
    let redacted = data;
    
    // Redact SSN
    redacted = redacted.replace(SENSITIVE_PATTERNS.ssn, 'XXX-XX-XXXX');
    
    // Redact credit cards
    redacted = redacted.replace(SENSITIVE_PATTERNS.creditCard, 'XXXX-XXXX-XXXX-XXXX');
    
    // Redact emails (keep domain)
    redacted = redacted.replace(SENSITIVE_PATTERNS.email, (match) => {
      const [, domain] = match.split('@');
      return `****@${domain}`;
    });
    
    // Redact phone numbers
    redacted = redacted.replace(SENSITIVE_PATTERNS.phone, 'XXX-XXX-XXXX');
    
    return redacted;
  }
  
  /**
   * Log data access for audit trail
   */
  logDataAccess(record: Omit<DataAccessRecord, 'id' | 'timestamp'>): DataAccessRecord {
    const fullRecord: DataAccessRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...record
    };
    
    this.dataAccessLog.push(fullRecord);
    
    // Check for anomalous access patterns
    if (this.detectDataExfiltration(fullRecord)) {
      console.error('🚨 POTENTIAL DATA EXFILTRATION DETECTED', fullRecord);
      // TODO: Alert security team
      // TODO: Block user session
    }
    
    return fullRecord;
  }
  
  /**
   * Detect potential data exfiltration
   */
  private detectDataExfiltration(record: DataAccessRecord): boolean {
    // Check for large data transfers
    if (record.bytesTransferred > 100 * 1024 * 1024) { // 100MB
      return true;
    }
    
    // Check for unusual number of records accessed
    if (record.recordsAccessed > 10000) {
      return true;
    }
    
    // Check for access to sensitive data types
    if (record.dataType === 'pii' || record.dataType === 'financial') {
      if (record.recordsAccessed > 1000) {
        return true;
      }
    }
    
    // Check for unusual access patterns (many requests in short time)
    const recentAccess = this.dataAccessLog.filter(r => 
      r.userId === record.userId &&
      new Date(r.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    );
    
    if (recentAccess.length > 50) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, useSalt, 100000, 64, 'sha512');
    return `${useSalt}:${hash.toString('hex')}`;
  }
  
  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, originalHash] = hashedData.split(':');
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
    return hash.toString('hex') === originalHash;
  }
  
  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export const aegisGuardian = new AegisGuardian();
