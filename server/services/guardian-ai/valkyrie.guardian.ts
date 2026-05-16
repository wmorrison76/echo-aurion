/**
 * VALKYRIE Guardian
 * Threat Intelligence & Response
 * Chooses and executes response actions for detected threats
 */

import { SecurityEvent, ThreatLevel } from '../../../shared/types/security';

/**
 * Response action taken by Valkyrie
 */
export interface ThreatResponseAction {
  type: string;
  target: string;
  severity: ThreatLevel;
  timestamp: string;
  description?: string;
}

/**
 * Incident record
 */
interface Incident {
  id: string;
  securityEventId: string;
  threatLevel: ThreatLevel;
  attackType: string;
  ipAddress: string;
  openedAt: Date;
  closedAt?: Date;
  actionsTaken: ThreatResponseAction[];
  status: 'active' | 'resolved' | 'escalated';
}

/**
 * VALKYRIE Guardian - Threat Intelligence & Response
 */
export class ValkyrieGuardian {
  private incidents: Map<string, Incident> = new Map();
  private incidentCounter = 0;

  /**
   * Analyze security event and determine response actions
   */
  async analyzeAndRespond(event: SecurityEvent): Promise<{
    actionsTaken: ThreatResponseAction[];
    incidentId?: string;
    escalated: boolean;
  }> {
    const actionsTaken: ThreatResponseAction[] = [];

    // Block IP for critical/existential
    if (event.threatLevel === 'critical' || event.threatLevel === 'existential') {
      actionsTaken.push({
        type: 'block_ip',
        target: event.ipAddress,
        severity: event.threatLevel,
        timestamp: event.timestamp,
        description: `Blocked due to ${event.attackType}`
      });
    }

    // Revoke session if session hijacking suspected
    if (event.attackType === 'session_hijacking' && event.sessionId) {
      actionsTaken.push({
        type: 'revoke_session',
        target: event.sessionId,
        severity: 'critical',
        timestamp: event.timestamp
      });
    }

    // Alert for high+ threats
    if (event.threatLevel !== 'none' && event.threatLevel !== 'low') {
      actionsTaken.push({
        type: 'alert_security_team',
        target: event.ipAddress,
        severity: event.threatLevel,
        timestamp: event.timestamp,
        description: `Threat: ${event.attackType}, confidence: ${(event.confidence * 100).toFixed(0)}%`
      });
    }

    // Create incident for tracking
    const incidentId = this.openIncident(event, actionsTaken);

    return {
      actionsTaken,
      incidentId,
      escalated: event.threatLevel === 'critical' || event.threatLevel === 'existential'
    };
  }

  /**
   * Get incident statistics
   */
  getIncidentStats(): {
    total: number;
    active: number;
    resolved: number;
    escalated: number;
    bySeverity: Record<ThreatLevel, number>;
  } {
    const bySeverity: Record<ThreatLevel, number> = {
      none: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      existential: 0
    };

    let active = 0;
    let resolved = 0;
    let escalated = 0;

    for (const incident of this.incidents.values()) {
      bySeverity[incident.threatLevel]++;
      if (incident.status === 'active') active++;
      else if (incident.status === 'resolved') resolved++;
      else if (incident.status === 'escalated') escalated++;
    }

    return {
      total: this.incidents.size,
      active,
      resolved,
      escalated,
      bySeverity
    };
  }

  /**
   * Get currently active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(i => i.status === 'active');
  }

  /**
   * Open a new incident from a security event
   */
  private openIncident(event: SecurityEvent, actionsTaken: ThreatResponseAction[]): string {
    this.incidentCounter++;
    const id = `INC-${this.incidentCounter}-${Date.now()}`;

    const incident: Incident = {
      id,
      securityEventId: event.id,
      threatLevel: event.threatLevel,
      attackType: event.attackType,
      ipAddress: event.ipAddress,
      openedAt: new Date(event.timestamp),
      actionsTaken,
      status: 'active'
    };

    this.incidents.set(id, incident);
    return id;
  }

  /**
   * Resolve an incident
   */
  resolveIncident(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'resolved';
    incident.closedAt = new Date();
    return true;
  }

  /**
   * Escalate an incident
   */
  escalateIncident(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = 'escalated';
    return true;
  }
}

export const valkyrieGuardian = new ValkyrieGuardian();
