/**
 * Military-Grade Security Types
 * Enterprise-level threat detection and prevention
 */

import { UUID, ISODate } from './base';

// ============================================================================
// THREAT DETECTION
// ============================================================================

/**
 * Security threat levels
 */
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'existential';

/**
 * Attack types
 */
export type AttackType =
  | 'sql_injection'
  | 'xss'
  | 'csrf'
  | 'brute_force'
  | 'credential_stuffing'
  | 'ddos'
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'session_hijacking'
  | 'man_in_the_middle'
  | 'zero_day'
  | 'ransomware'
  | 'phishing'
  | 'social_engineering'
  | 'api_abuse'
  | 'rate_limit_abuse'
  | 'bot_attack'
  | 'account_takeover'
  | 'insider_threat'
  | 'advanced_persistent_threat';

/**
 * Security event
 */
export interface SecurityEvent {
  id: UUID;
  timestamp: ISODate;
  
  // Threat classification
  threatLevel: ThreatLevel;
  attackType: AttackType;
  confidence: number; // 0-1
  
  // Source
  ipAddress: string;
  userAgent?: string;
  userId?: UUID;
  sessionId?: UUID;
  
  // Target
  endpoint?: string;
  resource?: string;
  method?: string;
  
  // Attack details
  payload?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  
  // Geolocation
  country?: string;
  city?: string;
  isp?: string;
  
  // Fingerprinting
  deviceFingerprint?: string;
  browserFingerprint?: string;
  
  // Actions taken
  blocked: boolean;
  actionsTaken: string[];
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * IP reputation
 */
export interface IPReputation {
  ip: string;
  
  // Reputation score (0 = malicious, 100 = safe)
  score: number;
  
  // Threat indicators
  isProxy: boolean;
  isVPN: boolean;
  isTor: boolean;
  isHosting: boolean;
  isBot: boolean;
  
  // Historical behavior
  totalRequests: number;
  blockedRequests: number;
  suspiciousRequests: number;
  
  // Timing
  firstSeen: ISODate;
  lastSeen: ISODate;
  
  // Geolocation
  country?: string;
  city?: string;
  
  // Status
  isBlacklisted: boolean;
  isWhitelisted: boolean;
}

/**
 * User behavior profile
 */
export interface UserBehaviorProfile {
  userId: UUID;
  
  // Normal patterns
  normalLoginTimes: number[]; // Hours [0-23]
  normalLocations: string[];
  normalDevices: string[];
  normalIPRanges: string[];
  
  // Anomaly detection
  anomalyScore: number;
  recentAnomalies: string[];
  
  // Risk factors
  failedLoginAttempts: number;
  accountLockouts: number;
  privilegeEscalations: number;
  dataAccessAnomalies: number;
  
  // Profile metadata
  profiledSince: ISODate;
  lastUpdated: ISODate;
}

/**
 * Data access record (for leak detection)
 */
export interface DataAccessRecord {
  id: UUID;
  timestamp: ISODate;
  
  // Who
  userId: UUID;
  sessionId: UUID;
  ipAddress: string;
  
  // What
  dataType: 'pii' | 'financial' | 'credentials' | 'sensitive' | 'internal' | 'public';
  recordsAccessed: number;
  bytesTransferred: number;
  
  // How
  method: string;
  endpoint: string;
  
  // Classification
  riskScore: number;
  isAnomalous: boolean;
  
  // Actions
  wasFlagged: boolean;
  wasBlocked: boolean;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-4096';
  keyRotationDays: number;
  enforceAtRest: boolean;
  enforceInTransit: boolean;
  enforceEndToEnd: boolean;
}

// ============================================================================
// SECURITY RULES
// ============================================================================

/**
 * Security rule definition
 */
export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  
  // Detection
  pattern: string | RegExp;
  threshold?: number;
  timeWindow?: number; // seconds
  
  // Response
  action: 'log' | 'alert' | 'block' | 'rate_limit' | 'captcha' | 'mfa_required' | 'quarantine';
  severity: ThreatLevel;
  
  // Configuration
  isEnabled: boolean;
  appliesTo: 'all' | 'authenticated' | 'anonymous' | 'admin';
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
  
  // Graduated response
  warningThreshold: number; // % of maxRequests
  
  // Bypass
  whitelistedIPs?: string[];
  whitelistedUsers?: UUID[];
}

/**
 * Security audit log
 */
export interface SecurityAuditLog {
  id: UUID;
  timestamp: ISODate;
  
  // Event
  eventType: 'login' | 'logout' | 'data_access' | 'permission_change' | 'config_change' | 'security_event';
  
  // Details
  userId?: UUID;
  ipAddress?: string;
  resource?: string;
  action?: string;
  
  // Result
  success: boolean;
  failureReason?: string;
  
  // Compliance
  complianceFlags: string[];
  retentionDays: number;
  
  // Immutability
  hash: string;
  previousHash?: string;
  blockchainVerified: boolean;
}
