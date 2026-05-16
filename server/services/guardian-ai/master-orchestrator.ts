/**
 * Master Guardian Orchestrator
 * Coordinates all 9 guardian systems for complete protection
 */

import { sentinelGuardian } from './sentinel.guardian';
import { aegisGuardian } from './aegis.guardian';
import { cerberusGuardian } from './cerberus.guardian';
import { heimdallGuardian } from './heimdall.guardian';
import { valkyrieGuardian } from './valkyrie.guardian';
import { SecurityEvent, ThreatLevel } from '../../../shared/types/security';
import { UUID } from '../../../shared/types/base';

/**
 * Complete security analysis result
 */
export interface SecurityAnalysisResult {
  // Overall assessment
  threatLevel: ThreatLevel;
  allowed: boolean;

  // Individual guardian results
  sentinel: Awaited<ReturnType<typeof sentinelGuardian.analyzeRequest>>;
  aegis: {
    hasSensitiveData: boolean;
    dataProtected: boolean;
  };
  cerberus: Awaited<ReturnType<typeof cerberusGuardian.validateAuthentication>> | null;
  heimdall: ReturnType<typeof heimdallGuardian.trackRequest>;
  valkyrie: Awaited<ReturnType<typeof valkyrieGuardian.analyzeAndRespond>> | null;

  // Actions
  actionsTaken: string[];
  recommendations: string[];
}

/**
 * Master Guardian Orchestrator
 */
export class MasterGuardianOrchestrator {
  /**
   * Analyze complete security posture of a request
   */
  async analyzeRequest(request: {
    // Network
    ip: string;
    userAgent?: string;
    headers?: Record<string, string>;

    // Auth
    userId?: UUID;
    sessionId?: UUID;
    credentials?: { identifier: string; password: string };

    // Request details
    endpoint: string;
    method: string;
    payload?: any;
    queryParams?: Record<string, string>;

    // Metrics
    bytesTransferred?: number;
  }): Promise<SecurityAnalysisResult> {
    const actionsTaken: string[] = [];
    const recommendations: string[] = [];

    // 1. SENTINEL - Intrusion Detection
    const sentinelResult = await sentinelGuardian.analyzeRequest({
      ip: request.ip,
      userAgent: request.userAgent,
      userId: request.userId,
      sessionId: request.sessionId,
      endpoint: request.endpoint,
      method: request.method,
      payload: request.payload,
      headers: request.headers,
      queryParams: request.queryParams
    });

    if (sentinelResult.blocked) {
      actionsTaken.push('Request blocked by Sentinel (Intrusion Detection)');
    }

    // 2. AEGIS - Data Protection
    let aegisResult = { hasSensitiveData: false, dataProtected: false };
    if (request.payload) {
      const payloadStr = JSON.stringify(request.payload);
      const scan = aegisGuardian.scanForSensitiveData(payloadStr);
      aegisResult.hasSensitiveData = scan.hasSensitiveData;

      if (scan.hasSensitiveData) {
        actionsTaken.push(`Sensitive data detected: ${scan.types.join(', ')}`);
        recommendations.push('Encrypt sensitive data in transit and at rest');
      }
    }

    // 3. CERBERUS - Authentication
    let cerberusResult = null;
    if (request.credentials) {
      cerberusResult = await cerberusGuardian.validateAuthentication(
        request.credentials.identifier,
        request.credentials.password,
        request.ip
      );

      if (!cerberusResult.allowed) {
        actionsTaken.push('Authentication failed');
      }
      if (cerberusResult.requiresMFA) {
        actionsTaken.push('MFA required');
      }
    }

    // 4. HEIMDALL - Network Security
    const heimdallResult = heimdallGuardian.trackRequest(
      request.ip,
      request.endpoint,
      200, // Status code (would come from actual response)
      request.bytesTransferred || 0
    );

    if (!heimdallResult.allowed) {
      actionsTaken.push(`Blocked by Heimdall: ${heimdallResult.reason}`);
    }

    // Check for DDoS
    const ddosDetection = heimdallGuardian.analyzeDDoS();
    if (ddosDetection.isAttack) {
      actionsTaken.push(`DDoS Attack Detected: ${ddosDetection.attackType}`);
      recommendations.push(ddosDetection.recommendation);
    }

    // 5. VALKYRIE - Threat Response
    let valkyrieResult = null;
    if (sentinelResult.threatLevel !== 'none') {
      valkyrieResult = await valkyrieGuardian.analyzeAndRespond(sentinelResult);

      if (valkyrieResult.actionsTaken.length > 0) {
        actionsTaken.push(...valkyrieResult.actionsTaken.map(a =>
          `Valkyrie action: ${a.type} on ${a.target}`
        ));
      }
    }

    // Determine overall threat level (highest from all guardians)
    const threatLevels = [
      sentinelResult.threatLevel,
      heimdallResult.threatLevel
    ];

    const overallThreatLevel = this.getHighestThreatLevel(threatLevels);

    // Determine if request should be allowed
    const allowed =
      !sentinelResult.blocked &&
      heimdallResult.allowed &&
      (cerberusResult === null || cerberusResult.allowed);

    return {
      threatLevel: overallThreatLevel,
      allowed,
      sentinel: sentinelResult,
      aegis: aegisResult,
      cerberus: cerberusResult,
      heimdall: heimdallResult,
      valkyrie: valkyrieResult,
      actionsTaken,
      recommendations
    };
  }

  /**
   * Get highest threat level from array
   */
  private getHighestThreatLevel(levels: ThreatLevel[]): ThreatLevel {
    const priority: ThreatLevel[] = ['existential', 'critical', 'high', 'medium', 'low', 'none'];

    for (const level of priority) {
      if (levels.includes(level)) {
        return level;
      }
    }

    return 'none';
  }

  /**
   * Get security dashboard stats
   */
  getDashboardStats() {
    return {
      network: heimdallGuardian.getNetworkStats(),
      incidents: valkyrieGuardian.getIncidentStats(),
      activeIncidents: valkyrieGuardian.getActiveIncidents()
    };
  }
}

export const masterGuardian = new MasterGuardianOrchestrator();
