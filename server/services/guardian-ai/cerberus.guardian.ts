/**
 * CERBERUS Guardian
 * Multi-Factor Authentication & Access Control
 * Three-headed guardian of authentication (Password + MFA + Biometric)
 */

import crypto from 'crypto';
import { UUID } from '../../../shared/types/base';
import { ThreatLevel } from '../../../shared/types/security';

/**
 * Authentication attempt
 */
interface AuthAttempt {
  userId?: UUID;
  username?: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  method: 'password' | 'mfa' | 'biometric' | 'api_key' | 'oauth';
}

/**
 * MFA challenge
 */
interface MFAChallenge {
  userId: UUID;
  type: 'totp' | 'sms' | 'email' | 'push' | 'hardware_token';
  code: string;
  expiresAt: Date;
  attempts: number;
}

/**
 * Session security
 */
interface SecureSession {
  id: UUID;
  userId: UUID;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  mfaVerified: boolean;
  riskScore: number;
}

/**
 * CERBERUS Guardian - Access Control
 */
export class CerberusGuardian {
  private failedAttempts: Map<string, AuthAttempt[]> = new Map();
  private lockedAccounts: Map<string, Date> = new Map();
  private activeSessions: Map<string, SecureSession> = new Map();
  private mfaChallenges: Map<string, MFAChallenge> = new Map();

  // Configuration
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly MFA_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate authentication attempt
   */
  async validateAuthentication(
    identifier: string, // username, email, or userId
    credential: string,
    ipAddress: string,
    additionalFactors?: {
      mfaCode?: string;
      biometric?: string;
      deviceFingerprint?: string;
    }
  ): Promise<{
    allowed: boolean;
    requiresMFA: boolean;
    requiresPasswordChange: boolean;
    threatLevel: ThreatLevel;
    sessionId?: UUID;
    reason?: string;
  }> {
    // 1. Check if account is locked
    if (this.isAccountLocked(identifier)) {
      this.logAuthAttempt(identifier, ipAddress, false, 'password');
      return {
        allowed: false,
        requiresMFA: false,
        requiresPasswordChange: false,
        threatLevel: 'high',
        reason: 'Account temporarily locked due to multiple failed attempts'
      };
    }

    // 2. Check for brute force attempts
    const recentFailures = this.getRecentFailedAttempts(identifier);
    if (recentFailures >= this.MAX_FAILED_ATTEMPTS) {
      this.lockAccount(identifier);
      return {
        allowed: false,
        requiresMFA: false,
        requiresPasswordChange: false,
        threatLevel: 'critical',
        reason: 'Too many failed attempts. Account locked for 15 minutes.'
      };
    }

    // 3. Validate primary credential (password/API key)
    const credentialValid = await this.validateCredential(identifier, credential);

    if (!credentialValid) {
      this.logAuthAttempt(identifier, ipAddress, false, 'password');
      return {
        allowed: false,
        requiresMFA: false,
        requiresPasswordChange: false,
        threatLevel: recentFailures >= 3 ? 'medium' : 'low',
        reason: 'Invalid credentials'
      };
    }

    // 4. Check if MFA is required
    const requiresMFA = await this.shouldRequireMFA(identifier, ipAddress, additionalFactors);

    if (requiresMFA && !additionalFactors?.mfaCode) {
      // Generate and send MFA challenge
      await this.generateMFAChallenge(identifier);
      return {
        allowed: false,
        requiresMFA: true,
        requiresPasswordChange: false,
        threatLevel: 'none',
        reason: 'MFA verification required'
      };
    }

    // 5. Verify MFA if provided
    if (additionalFactors?.mfaCode) {
      const mfaValid = await this.verifyMFA(identifier, additionalFactors.mfaCode);
      if (!mfaValid) {
        return {
          allowed: false,
          requiresMFA: true,
          requiresPasswordChange: false,
          threatLevel: 'medium',
          reason: 'Invalid MFA code'
        };
      }
    }

    // 6. Check password age and complexity
    const requiresPasswordChange = await this.checkPasswordPolicy(identifier);

    // 7. Calculate session risk score
    const riskScore = this.calculateSessionRisk(identifier, ipAddress, additionalFactors);

    // 8. Create secure session
    const sessionId = await this.createSecureSession(
      identifier,
      ipAddress,
      additionalFactors?.deviceFingerprint || 'unknown',
      riskScore
    );

    // Log successful authentication
    this.logAuthAttempt(identifier, ipAddress, true, 'password');
    this.clearFailedAttempts(identifier);

    return {
      allowed: true,
      requiresMFA: false,
      requiresPasswordChange,
      threatLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      sessionId
    };
  }

  /**
   * Validate session and check for hijacking
   */
  validateSession(
    sessionId: UUID,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint: string
  ): {
    valid: boolean;
    requiresReauth: boolean;
    threatLevel: ThreatLevel;
    reason?: string;
  } {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return {
        valid: false,
        requiresReauth: true,
        threatLevel: 'medium',
        reason: 'Session not found or expired'
      };
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      this.activeSessions.delete(sessionId);
      return {
        valid: false,
        requiresReauth: true,
        threatLevel: 'low',
        reason: 'Session expired'
      };
    }

    // Check for session inactivity timeout
    const inactiveMs = Date.now() - session.lastActivity.getTime();
    if (inactiveMs > this.SESSION_TIMEOUT_MS) {
      this.activeSessions.delete(sessionId);
      return {
        valid: false,
        requiresReauth: true,
        threatLevel: 'low',
        reason: 'Session timeout due to inactivity'
      };
    }

    // Detect session hijacking attempts
    let threatLevel: ThreatLevel = 'none';

    // IP address changed
    if (session.ipAddress !== ipAddress) {
      threatLevel = 'critical';
      this.activeSessions.delete(sessionId);
      console.error('🚨 SESSION HIJACKING DETECTED: IP address mismatch', {
        sessionId,
        originalIP: session.ipAddress,
        newIP: ipAddress
      });
      return {
        valid: false,
        requiresReauth: true,
        threatLevel: 'critical',
        reason: 'Session security violation: IP address changed'
      };
    }

    // User agent changed
    if (session.userAgent !== userAgent) {
      threatLevel = 'high';
      console.warn('⚠️ SUSPICIOUS ACTIVITY: User agent changed', {
        sessionId,
        originalUA: session.userAgent,
        newUA: userAgent
      });
    }

    // Device fingerprint changed
    if (session.deviceFingerprint !== deviceFingerprint) {
      threatLevel = 'high';
      console.warn('⚠️ SUSPICIOUS ACTIVITY: Device fingerprint changed', {
        sessionId,
        originalFP: session.deviceFingerprint,
        newFP: deviceFingerprint
      });
    }

    // Update last activity
    session.lastActivity = new Date();

    // Require MFA re-verification for high-risk sessions
    if (threatLevel === 'high' && !session.mfaVerified) {
      return {
        valid: false,
        requiresReauth: true,
        threatLevel: 'high',
        reason: 'MFA re-verification required due to suspicious activity'
      };
    }

    return {
      valid: true,
      requiresReauth: false,
      threatLevel
    };
  }

  /**
   * Generate MFA challenge
   */
  private async generateMFAChallenge(userId: string): Promise<string> {
    // Generate 6-digit TOTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const challenge: MFAChallenge = {
      userId: userId as UUID,
      type: 'totp',
      code,
      expiresAt: new Date(Date.now() + this.MFA_CODE_EXPIRY_MS),
      attempts: 0
    };

    this.mfaChallenges.set(userId, challenge);

    // TODO: Send code via SMS/Email/Push notification
    console.log(`📱 MFA Code for ${userId}: ${code}`);

    return code;
  }

  /**
   * Verify MFA code
   */
  private async verifyMFA(userId: string, providedCode: string): Promise<boolean> {
    const challenge = this.mfaChallenges.get(userId);

    if (!challenge) {
      return false;
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      this.mfaChallenges.delete(userId);
      return false;
    }

    // Increment attempts
    challenge.attempts++;

    // Too many attempts
    if (challenge.attempts > 3) {
      this.mfaChallenges.delete(userId);
      this.lockAccount(userId);
      return false;
    }

    // Verify code
    if (challenge.code === providedCode) {
      this.mfaChallenges.delete(userId);
      return true;
    }

    return false;
  }

  /**
   * Create secure session
   */
  private async createSecureSession(
    userId: string,
    ipAddress: string,
    deviceFingerprint: string,
    riskScore: number
  ): Promise<UUID> {
    const sessionId = crypto.randomUUID();

    const session: SecureSession = {
      id: sessionId,
      userId: userId as UUID,
      ipAddress,
      userAgent: 'Unknown', // Should be passed from request
      deviceFingerprint,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      mfaVerified: true,
      riskScore
    };

    this.activeSessions.set(sessionId, session);

    return sessionId;
  }

  /**
   * Calculate session risk score
   */
  private calculateSessionRisk(
    userId: string,
    ipAddress: string,
    additionalFactors?: any
  ): number {
    let risk = 0;

    // Check for new IP
    // TODO: Check against user's historical IPs
    risk += 10;

    // Check for new device
    if (!additionalFactors?.deviceFingerprint) {
      risk += 20;
    }

    // Check for unusual login time
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      risk += 15;
    }

    // Check recent failed attempts
    const recentFailures = this.getRecentFailedAttempts(userId);
    risk += recentFailures * 10;

    return Math.min(risk, 100);
  }

  /**
   * Validate credential (password hash)
   */
  private async validateCredential(identifier: string, credential: string): Promise<boolean> {
    // TODO: Implement actual password validation against database
    // This is a placeholder
    return credential.length > 8;
  }

  /**
   * Check if MFA should be required
   */
  private async shouldRequireMFA(
    userId: string,
    ipAddress: string,
    additionalFactors?: any
  ): Promise<boolean> {
    // Always require MFA for:
    // 1. Admin accounts
    // 2. New devices
    // 3. New locations
    // 4. High-risk sessions

    // TODO: Check user role
    // TODO: Check IP reputation
    // TODO: Check device history

    return true; // Always require MFA for now
  }

  /**
   * Check password policy compliance
   */
  private async checkPasswordPolicy(userId: string): Promise<boolean> {
    // TODO: Check password age (force change every 90 days)
    // TODO: Check password complexity
    // TODO: Check against breached password database
    return false;
  }

  /**
   * Lock account
   */
  private lockAccount(identifier: string): void {
    const unlockTime = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
    this.lockedAccounts.set(identifier, unlockTime);
    console.warn(`🔒 ACCOUNT LOCKED: ${identifier} until ${unlockTime.toISOString()}`);
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(identifier: string): boolean {
    const unlockTime = this.lockedAccounts.get(identifier);
    if (!unlockTime) return false;

    if (new Date() > unlockTime) {
      this.lockedAccounts.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Log authentication attempt
   */
  private logAuthAttempt(
    identifier: string,
    ipAddress: string,
    success: boolean,
    method: AuthAttempt['method']
  ): void {
    const attempts = this.failedAttempts.get(identifier) || [];

    attempts.push({
      username: identifier,
      ipAddress,
      timestamp: new Date(),
      success,
      method
    });

    // Keep only last 100 attempts
    if (attempts.length > 100) {
      attempts.shift();
    }

    this.failedAttempts.set(identifier, attempts);
  }

  /**
   * Get recent failed attempts
   */
  private getRecentFailedAttempts(identifier: string): number {
    const attempts = this.failedAttempts.get(identifier) || [];
    const recentWindow = Date.now() - 15 * 60 * 1000; // Last 15 minutes

    return attempts.filter(a =>
      !a.success && a.timestamp.getTime() > recentWindow
    ).length;
  }

  /**
   * Clear failed attempts
   */
  private clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Terminate session
   */
  terminateSession(sessionId: UUID): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Terminate all sessions for user
   */
  terminateAllUserSessions(userId: UUID): void {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

export const cerberusGuardian = new CerberusGuardian();
