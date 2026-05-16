/**
 * SENTINEL Guardian
 * Intrusion Detection & Prevention System (IDS/IPS)
 * Military-grade threat detection
 */

import {
  SecurityEvent,
  ThreatLevel,
  AttackType,
  IPReputation,
} from '../../../shared/types/security';
import { UUID } from '../../../shared/types/base';

/**
 * Known attack patterns (signatures)
 */
const ATTACK_SIGNATURES: Map<AttackType, RegExp[]> = new Map([
  ['sql_injection', [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bfrom\b.*\bwhere\b)/i,
    /('\s*or\s*'1'\s*=\s*'1)|('\s*or\s*1\s*=\s*1)/i,
    /;\s*drop\s+table/i,
    /exec\s*\(/i,
    /script.*onerror/i
  ]],
  ['xss', [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /<iframe/i,
    /eval\(/i
  ]],
  ['api_abuse', [
    /;\s*cat\s+\/etc\/passwd/i,
    /\|\s*nc\s+-/i,
    /&&\s*wget/i,
    /`.*`/,
    /\$\(.*\)/
  ]],
  ['data_exfiltration', [
    /\.\.\//,
    /\.\.%2[fF]/,
    new RegExp('\\.\\.\\\\/')
  ]],
  ['privilege_escalation', [
    /<!ENTITY.*SYSTEM/i,
    /<!DOCTYPE.*\[/i
  ]]
]);

/**
 * Sentinel Guardian - Intrusion Detection
 */
export class SentinelGuardian {
  private ipReputationCache: Map<string, IPReputation> = new Map();
  private blockedIPs: Set<string> = new Set();
  private requestCounts: Map<string, { count: number; firstRequest: Date }> = new Map();
  
  /**
   * Analyze incoming request for threats
   */
  async analyzeRequest(request: {
    ip: string;
    userAgent?: string;
    userId?: UUID;
    sessionId?: UUID;
    endpoint: string;
    method: string;
    payload?: any;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
  }): Promise<SecurityEvent> {
    const threats: { type: AttackType; confidence: number }[] = [];
    
    // 1. Check if IP is already blocked
    if (this.blockedIPs.has(request.ip)) {
      return this.createSecurityEvent(request, 'critical', 'api_abuse', 1.0, true);
    }
    
    // 2. Check IP reputation
    const ipReputation = await this.checkIPReputation(request.ip);
    if (ipReputation.score < 30) {
      threats.push({ type: 'bot_attack', confidence: 0.9 });
    }
    
    // 3. Rate limiting check
    const isRateLimitExceeded = this.checkRateLimit(request.ip);
    if (isRateLimitExceeded) {
      threats.push({ type: 'rate_limit_abuse', confidence: 1.0 });
    }
    
    // 4. Scan payload for attack signatures
    const payloadThreats = this.scanPayload(request.payload);
    threats.push(...payloadThreats);
    
    // 5. Scan headers for anomalies
    const headerThreats = this.scanHeaders(request.headers);
    threats.push(...headerThreats);
    
    // 6. Scan query parameters
    const queryThreats = this.scanQueryParams(request.queryParams);
    threats.push(...queryThreats);
    
    // 7. Check for suspicious user agents
    if (request.userAgent) {
      const uaThreats = this.checkUserAgent(request.userAgent);
      threats.push(...uaThreats);
    }
    
    // 8. Behavioral analysis
    if (request.userId) {
      const behaviorThreats = await this.analyzeBehavior(request.userId, request);
      threats.push(...behaviorThreats);
    }
    
    // Determine overall threat level
    const highestThreat = threats.reduce(
      (max, t) => (t.confidence > max.confidence ? t : max),
      { type: 'api_abuse' as AttackType, confidence: 0 }
    );
    
    const threatLevel = this.calculateThreatLevel(highestThreat.confidence, threats.length);
    const shouldBlock = threatLevel === 'critical' || threatLevel === 'existential';
    
    if (shouldBlock) {
      this.blockIP(request.ip);
    }
    
    return this.createSecurityEvent(
      request,
      threatLevel,
      highestThreat.type,
      highestThreat.confidence,
      shouldBlock
    );
  }
  
  /**
   * Scan payload for attack patterns
   */
  private scanPayload(payload: any): { type: AttackType; confidence: number }[] {
    if (!payload) return [];
    
    const threats: { type: AttackType; confidence: number }[] = [];
    const payloadStr = JSON.stringify(payload);
    
    for (const [attackType, patterns] of ATTACK_SIGNATURES.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(payloadStr)) {
          threats.push({ type: attackType, confidence: 0.95 });
          break;
        }
      }
    }
    
    return threats;
  }
  
  /**
   * Scan headers for anomalies
   */
  private scanHeaders(headers?: Record<string, string>): { type: AttackType; confidence: number }[] {
    if (!headers) return [];
    
    const threats: { type: AttackType; confidence: number }[] = [];
    
    // Check for missing security headers
    if (!headers['x-csrf-token'] && !headers['csrf-token']) {
      threats.push({ type: 'csrf', confidence: 0.3 });
    }
    
    // Check for suspicious referrers
    if (headers['referer'] && this.isSuspiciousReferrer(headers['referer'])) {
      threats.push({ type: 'phishing', confidence: 0.7 });
    }
    
    // Check for header injection attempts
    const headerStr = JSON.stringify(headers);
    if (/\r\n|\n\r/.test(headerStr)) {
      threats.push({ type: 'man_in_the_middle', confidence: 0.8 });
    }
    
    return threats;
  }
  
  /**
   * Scan query parameters
   */
  private scanQueryParams(params?: Record<string, string>): { type: AttackType; confidence: number }[] {
    if (!params) return [];
    
    const threats: { type: AttackType; confidence: number }[] = [];
    const paramsStr = JSON.stringify(params);
    
    // Check for SQL injection in query params
    if (ATTACK_SIGNATURES.get('sql_injection')?.some(p => p.test(paramsStr))) {
      threats.push({ type: 'sql_injection', confidence: 0.9 });
    }
    
    // Check for XSS in query params
    if (ATTACK_SIGNATURES.get('xss')?.some(p => p.test(paramsStr))) {
      threats.push({ type: 'xss', confidence: 0.9 });
    }
    
    return threats;
  }
  
  /**
   * Check user agent for bot signatures
   */
  private checkUserAgent(userAgent: string): { type: AttackType; confidence: number }[] {
    const threats: { type: AttackType; confidence: number }[] = [];
    
    const botSignatures = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|java|perl/i,
      /headless|phantom|selenium/i
    ];
    
    for (const signature of botSignatures) {
      if (signature.test(userAgent)) {
        threats.push({ type: 'bot_attack', confidence: 0.8 });
        break;
      }
    }
    
    return threats;
  }
  
  /**
   * Check IP reputation
   */
  private async checkIPReputation(ip: string): Promise<IPReputation> {
    // Check cache first
    if (this.ipReputationCache.has(ip)) {
      return this.ipReputationCache.get(ip)!;
    }
    
    // Calculate reputation based on history
    const reputation: IPReputation = {
      ip,
      score: 100, // Start with perfect score
      isProxy: false,
      isVPN: false,
      isTor: false,
      isHosting: false,
      isBot: false,
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isBlacklisted: false,
      isWhitelisted: false
    };
    
    // TODO: Integrate with IP intelligence services (AbuseIPDB, IPQualityScore, etc.)
    // For now, use local heuristics
    
    // Check if IP is in known VPN/proxy ranges
    if (this.isKnownProxy(ip)) {
      reputation.isProxy = true;
      reputation.score -= 20;
    }
    
    // Check if IP is Tor exit node
    if (await this.isTorExitNode(ip)) {
      reputation.isTor = true;
      reputation.score -= 30;
    }
    
    // Cache the result
    this.ipReputationCache.set(ip, reputation);
    
    return reputation;
  }
  
  /**
   * Rate limiting check
   */
  private checkRateLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = new Date();
    const record = this.requestCounts.get(ip);
    
    if (!record) {
      this.requestCounts.set(ip, { count: 1, firstRequest: now });
      return false;
    }
    
    const timeDiff = now.getTime() - record.firstRequest.getTime();
    
    if (timeDiff > windowMs) {
      // Reset window
      this.requestCounts.set(ip, { count: 1, firstRequest: now });
      return false;
    }
    
    record.count++;
    
    if (record.count > maxRequests) {
      return true; // Rate limit exceeded
    }
    
    return false;
  }
  
  /**
   * Analyze user behavior for anomalies
   */
  private async analyzeBehavior(
    userId: UUID,
    request: any
  ): Promise<{ type: AttackType; confidence: number }[]> {
    const threats: { type: AttackType; confidence: number }[] = [];
    
    // TODO: Implement behavioral analysis
    // - Check for unusual login times
    // - Check for unusual locations
    // - Check for privilege escalation attempts
    // - Check for data exfiltration patterns
    
    return threats;
  }
  
  /**
   * Calculate overall threat level
   */
  private calculateThreatLevel(maxConfidence: number, threatCount: number): ThreatLevel {
    if (maxConfidence >= 0.95 || threatCount >= 5) return 'existential';
    if (maxConfidence >= 0.85 || threatCount >= 3) return 'critical';
    if (maxConfidence >= 0.7 || threatCount >= 2) return 'high';
    if (maxConfidence >= 0.5) return 'medium';
    if (maxConfidence >= 0.3) return 'low';
    return 'none';
  }
  
  /**
   * Block an IP address
   */
  private blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    console.warn(`🚨 BLOCKED IP: ${ip}`);
    
    // TODO: Persist to database
    // TODO: Notify security team
    // TODO: Add to WAF blocklist
  }
  
  /**
   * Create security event
   */
  private createSecurityEvent(
    request: any,
    threatLevel: ThreatLevel,
    attackType: AttackType,
    confidence: number,
    blocked: boolean
  ): SecurityEvent {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      threatLevel,
      attackType,
      confidence,
      ipAddress: request.ip,
      userAgent: request.userAgent,
      userId: request.userId,
      sessionId: request.sessionId,
      endpoint: request.endpoint,
      method: request.method,
      payload: JSON.stringify(request.payload),
      headers: request.headers,
      queryParams: request.queryParams,
      blocked,
      actionsTaken: blocked ? ['ip_blocked', 'request_denied'] : ['logged', 'monitored']
    };
  }
  
  /**
   * Helper: Check if IP is known proxy
   */
  private isKnownProxy(ip: string): boolean {
    // TODO: Implement proxy detection
    return false;
  }
  
  /**
   * Helper: Check if IP is Tor exit node
   */
  private async isTorExitNode(ip: string): Promise<boolean> {
    // TODO: Check against Tor exit node list
    return false;
  }
  
  /**
   * Helper: Check if referrer is suspicious
   */
  private isSuspiciousReferrer(referrer: string): boolean {
    const suspiciousDomains = ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com'];
    return suspiciousDomains.some(domain => referrer.includes(domain));
  }
}

export const sentinelGuardian = new SentinelGuardian();
