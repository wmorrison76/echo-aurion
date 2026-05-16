/**
 * Authentication Services
 * Handles password hashing, JWT generation, and token validation
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { logger } from "./logger";

/**
 * Password hashing using bcryptjs
 * SECURITY: Uses industry-standard password hashing algorithm
 *
 * REQUIRED: Install bcryptjs with: npm install bcryptjs
 * DO NOT use custom password hashing in production
 */
export class PasswordService {
  private static bcrypt: typeof import("bcryptjs") | null = null;

  private static initializeBcrypt() {
    if (this.bcrypt) return;

    try {
      // Dynamically import bcryptjs for password hashing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.bcrypt = require("bcryptjs");
    } catch {
      throw new Error(
        "CRITICAL: bcryptjs is required for password hashing. Install it with: npm install bcryptjs",
      );
    }
  }

  /**
   * Hash password using bcryptjs (production-grade)
   * SECURITY: Uses bcryptjs with salt rounds=12 for optimal security/performance tradeoff
   */
  static hashPassword(password: string): string {
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    if (!this.bcrypt) {
      this.initializeBcrypt();
    }

    // bcryptjs.hashSync uses 10 rounds by default, we increase to 12 for better security
    const saltRounds = 12;
    const hash = this.bcrypt.hashSync(password, saltRounds);
    return hash;
  }

  /**
   * Verify password against hash using bcryptjs
   * SECURITY: Timing-safe comparison
   */
  static verifyPassword(password: string, hash: string): boolean {
    try {
      if (!this.bcrypt) {
        this.initializeBcrypt();
      }
      // bcryptjs.compareSync is timing-safe and handles all hash format variations
      return this.bcrypt.compareSync(password, hash);
    } catch (error) {
      logger.error("[Auth] Password verification error", { error });
      return false;
    }
  }

  /**
   * Validate password complexity
   */
  static validatePasswordComplexity(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain lowercase letter");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain uppercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain number");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * JWT Token Management
 */
export interface JWTPayload {
  sub: string; // user_id
  org_id: string;
  email: string;
  role?: string; // user role for RBAC
  iat: number; // issued at
  exp: number; // expiration
  aud: string; // audience
  iss: string; // issuer
}

export class JWTService {
  private static secret: string;
  private static issuer = "hospitality-suite";
  private static audience = "hospitality-suite-users";

  static {
    // D17e · read from the TS-side fuse box (server/lib/env.ts) instead
    // of inline process.env. Centralizes prod/dev policy + dev fallback
    // behavior with the rest of the codebase.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getJwtSecret } = require("./env");
    this.secret = getJwtSecret();
  }

  /**
   * Generate JWT token
   */
  static generateToken(
    userId: string,
    orgId: string,
    email: string,
    expiresInDays = 30,
    role?: string,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expiresInDays * 24 * 60 * 60;

    const payload: JWTPayload = {
      sub: userId,
      org_id: orgId,
      email,
      iat: now,
      exp: now + expiresIn,
      aud: this.audience,
      iss: this.issuer,
    };

    // Explicitly add role if provided
    if (role) {
      payload.role = role;
    }

    logger.debug("[JWT] Token generated", {
      userId,
      orgId,
      roleIncluded: !!role,
      roleValue: role || "NOT_PROVIDED",
    });

    // Log the actual payload being encoded
    const payloadStr = JSON.stringify(payload);
    logger.debug("[JWT] Encoding payload", {
      payloadKeys: Object.keys(payload),
      payloadRole: payload.role,
      hasRoleKey: "role" in payload,
      roleInString: payloadStr.includes('"role"'),
      payloadPreview: payloadStr.substring(0, 200),
    });

    // Simple JWT encoding (for demo)
    // Production should use jsonwebtoken library
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");

    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

    const signature = createHmac("sha256", this.secret)
      .update(`${header}.${body}`)
      .digest("base64url");

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      const [headerB64, bodyB64, signatureB64] = token.split(".");

      if (!headerB64 || !bodyB64 || !signatureB64) {
        logger.warn("[JWT] Invalid token format");
        return null;
      }

      // Verify signature
      const expectedSignature = createHmac("sha256", this.secret)
        .update(`${headerB64}.${bodyB64}`)
        .digest("base64url");

      const actual = Buffer.from(signatureB64);
      const expected = Buffer.from(expectedSignature);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        logger.warn("[JWT] Invalid signature");
        return null;
      }

      // Decode payload
      const payloadStr = Buffer.from(bodyB64, "base64url").toString("utf-8");
      const payload = JSON.parse(payloadStr) as JWTPayload;

      // Log decoded payload for debugging
      logger.debug("[JWT] Token decoded", {
        sub: payload.sub,
        role: payload.role,
        hasRole: "role" in payload,
        payloadKeys: Object.keys(payload),
        payloadPreview: payloadStr.substring(0, 200),
        roleInString: payloadStr.includes('"role"'),
      });

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        logger.warn("[JWT] Token expired");
        return null;
      }

      // Verify issuer and audience
      if (payload.iss !== this.issuer || payload.aud !== this.audience) {
        logger.warn("[JWT] Invalid issuer or audience");
        return null;
      }

      return payload;
    } catch (error) {
      logger.error("[JWT] Token verification error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const payload = this.verifyToken(token);
    return payload === null;
  }

  /**
   * Get expiration timestamp from token
   */
  static getTokenExpiration(token: string): number | null {
    const payload = this.verifyToken(token);
    return payload?.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  }
}

/**
 * Token Storage Service
 */
export class TokenStorageService {
  /**
   * Hash token for storage (never store plaintext)
   */
  static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate token hash for database lookup
   */
  static getTokenHash(token: string): string {
    return this.hashToken(token);
  }
}

/**
 * Rate Limiting Service (simple in-memory)
 */
export class RateLimitService {
  private static attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(
    key: string,
    maxAttempts = 5,
    windowSeconds = 300,
  ): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || record.resetAt < now) {
      // Reset window
      this.attempts.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return false;
    }

    record.count++;
    if (record.count > maxAttempts) {
      return true;
    }

    return false;
  }

  /**
   * Reset rate limit for key
   */
  static reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Cleanup old records (call periodically)
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (record.resetAt < now) {
        this.attempts.delete(key);
      }
    }
  }
}

// Cleanup every hour
setInterval(
  () => {
    RateLimitService.cleanup();
  },
  60 * 60 * 1000,
);
