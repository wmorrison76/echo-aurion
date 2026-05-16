/**
 * HEIMDALL Guardian
 * Network Security & DDoS Protection
 * All-seeing protector against network attacks
 */

import { ThreatLevel } from '../../../shared/types/security';

/**
 * Network traffic pattern
 */
interface TrafficPattern {
  ip: string;
  requestCount: number;
  bytesTransferred: number;
  firstRequest: Date;
  lastRequest: Date;
  endpoints: Map<string, number>;
  statusCodes: Map<number, number>;
}

/**
 * DDoS detection result
 */
interface DDoSDetection {
  isAttack: boolean;
  attackType: 'volumetric' | 'protocol' | 'application' | 'slowloris' | 'none';
  severity: ThreatLevel;
  attackerIPs: string[];
  requestsPerSecond: number;
  recommendation: string;
}

/**
 * HEIMDALL Guardian - Network Security
 */
export class HeimdallGuardian {
  private trafficPatterns: Map<string, TrafficPattern> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousIPs: Set<string> = new Set();

  // DDoS thresholds
  private readonly REQUESTS_PER_SECOND_THRESHOLD = 100;
  private readonly TOTAL_REQUESTS_THRESHOLD = 10000;
  private readonly UNIQUE_IPS_THRESHOLD = 1000;

  /**
   * Analyze network traffic for DDoS attacks
   */
  analyzeDDoS(timeWindowSeconds: number = 60): DDoSDetection {
    const now = Date.now();
    const windowStart = now - (timeWindowSeconds * 1000);

    let totalRequests = 0;
    let uniqueIPs = new Set<string>();
    let suspiciousIPs: string[] = [];

    // Analyze traffic patterns
    for (const [ip, pattern] of this.trafficPatterns.entries()) {
      if (pattern.lastRequest.getTime() < windowStart) {
        // Clean up old data
        this.trafficPatterns.delete(ip);
        continue;
      }

      totalRequests += pattern.requestCount;
      uniqueIPs.add(ip);

      // Check for suspicious patterns
      const requestsPerSecond = pattern.requestCount / timeWindowSeconds;

      if (requestsPerSecond > this.REQUESTS_PER_SECOND_THRESHOLD) {
        suspiciousIPs.push(ip);
        this.suspiciousIPs.add(ip);
      }
    }

    const requestsPerSecond = totalRequests / timeWindowSeconds;

    // Detect volumetric attack
    if (requestsPerSecond > this.REQUESTS_PER_SECOND_THRESHOLD * 10) {
      return {
        isAttack: true,
        attackType: 'volumetric',
        severity: 'critical',
        attackerIPs: suspiciousIPs,
        requestsPerSecond,
        recommendation: 'Enable rate limiting and block attacking IPs immediately'
      };
    }

    // Detect distributed attack
    if (uniqueIPs.size > this.UNIQUE_IPS_THRESHOLD &&
        requestsPerSecond > this.REQUESTS_PER_SECOND_THRESHOLD) {
      return {
        isAttack: true,
        attackType: 'volumetric',
        severity: 'high',
        attackerIPs: suspiciousIPs,
        requestsPerSecond,
        recommendation: 'Implement CAPTCHA and geographic filtering'
      };
    }

    // Detect application layer attack
    const applicationAttack = this.detectApplicationLayerAttack();
    if (applicationAttack) {
      return {
        isAttack: true,
        attackType: 'application',
        severity: 'high',
        attackerIPs: suspiciousIPs,
        requestsPerSecond,
        recommendation: 'Block suspicious IPs and implement request validation'
      };
    }

    return {
      isAttack: false,
      attackType: 'none',
      severity: 'none',
      attackerIPs: [],
      requestsPerSecond,
      recommendation: 'Normal traffic levels'
    };
  }

  /**
   * Track request and detect anomalies
   */
  trackRequest(
    ip: string,
    endpoint: string,
    statusCode: number,
    bytesTransferred: number
  ): {
    allowed: boolean;
    reason?: string;
    threatLevel: ThreatLevel;
  } {
    // Check if IP is already blocked
    if (this.blockedIPs.has(ip)) {
      return {
        allowed: false,
        reason: 'IP address is blocked',
        threatLevel: 'critical'
      };
    }

    // Get or create traffic pattern
    let pattern = this.trafficPatterns.get(ip);

    if (!pattern) {
      pattern = {
        ip,
        requestCount: 0,
        bytesTransferred: 0,
        firstRequest: new Date(),
        lastRequest: new Date(),
        endpoints: new Map(),
        statusCodes: new Map()
      };
      this.trafficPatterns.set(ip, pattern);
    }

    // Update pattern
    pattern.requestCount++;
    pattern.bytesTransferred += bytesTransferred;
    pattern.lastRequest = new Date();

    // Track endpoint usage
    const endpointCount = pattern.endpoints.get(endpoint) || 0;
    pattern.endpoints.set(endpoint, endpointCount + 1);

    // Track status codes
    const statusCount = pattern.statusCodes.get(statusCode) || 0;
    pattern.statusCodes.set(statusCode, statusCount + 1);

    // Check for rate limit violation
    const timeSinceFirst = Date.now() - pattern.firstRequest.getTime();
    const requestsPerSecond = (pattern.requestCount / timeSinceFirst) * 1000;

    if (requestsPerSecond > this.REQUESTS_PER_SECOND_THRESHOLD) {
      this.blockIP(ip, 'Rate limit exceeded');
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${requestsPerSecond.toFixed(2)} req/s`,
        threatLevel: 'high'
      };
    }

    // Check for endpoint abuse
    if (endpointCount > 1000) {
      this.suspiciousIPs.add(ip);
      return {
        allowed: true,
        threatLevel: 'medium'
      };
    }

    // Check for error rate (possible scanning)
    const errorCount = Array.from(pattern.statusCodes.entries())
      .filter(([code]) => code >= 400)
      .reduce((sum, [, count]) => sum + count, 0);

    const errorRate = errorCount / pattern.requestCount;

    if (errorRate > 0.5 && pattern.requestCount > 50) {
      this.suspiciousIPs.add(ip);
      return {
        allowed: true,
        reason: 'High error rate detected - possible scanning',
        threatLevel: 'medium'
      };
    }

    return {
      allowed: true,
      threatLevel: 'none'
    };
  }

  /**
   * Detect application layer attacks
   */
  private detectApplicationLayerAttack(): boolean {
    // Check for slowloris attack (many connections, slow requests)
    let slowConnections = 0;

    for (const [, pattern] of this.trafficPatterns.entries()) {
      const duration = pattern.lastRequest.getTime() - pattern.firstRequest.getTime();
      const avgTimePerRequest = duration / pattern.requestCount;

      // Connections taking > 30 seconds per request
      if (avgTimePerRequest > 30000) {
        slowConnections++;
      }
    }

    // If > 100 slow connections, likely slowloris
    if (slowConnections > 100) {
      console.warn('🐌 SLOWLORIS ATTACK DETECTED:', slowConnections, 'slow connections');
      return true;
    }

    return false;
  }

  /**
   * Block IP address
   */
  private blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    console.error(`🚫 BLOCKED IP: ${ip} - Reason: ${reason}`);

    // TODO: Add to WAF/firewall blocklist
    // TODO: Notify security team
  }

  /**
   * Check if IP is suspicious
   */
  isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Check if IP is blocked
   */
  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Unblock IP (manual intervention)
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`✅ UNBLOCKED IP: ${ip}`);
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    totalIPs: number;
    blockedIPs: number;
    suspiciousIPs: number;
    totalRequests: number;
    requestsPerSecond: number;
  } {
    let totalRequests = 0;
    const times = Array.from(this.trafficPatterns.values()).map(p => p.firstRequest.getTime());
    const duration = times.length > 0
      ? (Date.now() - Math.min(...times)) / 1000
      : 1;

    for (const pattern of this.trafficPatterns.values()) {
      totalRequests += pattern.requestCount;
    }

    return {
      totalIPs: this.trafficPatterns.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      totalRequests,
      requestsPerSecond: totalRequests / duration
    };
  }
}

export const heimdallGuardian = new HeimdallGuardian();
