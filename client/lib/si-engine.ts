import { EchoReasonGraph } from '@/core/ai3/EchoReasonGraph';
import { EchoContextCluster } from '@/core/ai3/EchoContextCluster';
import { EchoMemoryVault } from '@/core/ai3/EchoMemoryVault';
import { checkPermissionConsistency, ConsistencyReport, PermissionCheck } from './permission-consistency-checker';

export interface PermissionSuggestion {
  id: string;
  userId: string;
  userName: string;
  action: 'grant' | 'revoke' | 'modify';
  permissionKey: string;
  permissionName: string;
  reason: string;
  confidence: number; // 0-1
  reasoning: ReasoningChain;
  affectedRoles?: string[];
  affectedOutlets?: string[];
  suggestedAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'enforced';
  enforcedAt?: number;
  rejectedAt?: number;
  rejectionReason?: string;
  overriddenBy?: string; // user who overrode this
}

export interface ReasoningChain {
  contextFactors: string[];
  anomalies: string[];
  historicalPatterns: string[];
  recommendations: string[];
  riskAssessment: string;
}

export interface PermissionEnforcementPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  autoEnforce: boolean;
  requiresApproval: boolean;
  conditions: EnforcementCondition[];
  createdAt: number;
  lastModified: number;
}

export interface EnforcementCondition {
  type: 'anomaly' | 'inconsistency' | 'pattern' | 'risk';
  threshold: number;
  action: 'warn' | 'suggest' | 'enforce';
}

export class SIEngine {
  private static instance: SIEngine | null = null;
  private reasonGraph = EchoReasonGraph.getInstance();
  private contextCluster = EchoContextCluster.getInstance();
  private memoryVault = EchoMemoryVault.getInstance();

  private suggestions: Map<string, PermissionSuggestion> = new Map();
  private policies: Map<string, PermissionEnforcementPolicy> = new Map();
  private enforcementHistory: PermissionSuggestion[] = [];

  private constructor() {
    this.initializeDefaultPolicies();
  }

  static getInstance() {
    if (!SIEngine.instance) {
      SIEngine.instance = new SIEngine();
    }
    return SIEngine.instance;
  }

  private initializeDefaultPolicies() {
    const policies: PermissionEnforcementPolicy[] = [
      {
        id: 'policy-1',
        name: 'Critical Anomaly Enforcement',
        description: 'Auto-enforce critical permission anomalies detected by AI^3',
        enabled: true,
        autoEnforce: false,
        requiresApproval: true,
        conditions: [
          {
            type: 'anomaly',
            threshold: 0.9,
            action: 'enforce',
          },
        ],
        createdAt: Date.now(),
        lastModified: Date.now(),
      },
      {
        id: 'policy-2',
        name: 'Segregation of Duties Enforcement',
        description: 'Prevent conflicting permissions that violate segregation of duties',
        enabled: true,
        autoEnforce: true,
        requiresApproval: false,
        conditions: [
          {
            type: 'anomaly',
            threshold: 0.95,
            action: 'enforce',
          },
        ],
        createdAt: Date.now(),
        lastModified: Date.now(),
      },
      {
        id: 'policy-3',
        name: 'Excessive Permission Detection',
        description: 'Suggest permission reduction for users with excessive access',
        enabled: true,
        autoEnforce: false,
        requiresApproval: true,
        conditions: [
          {
            type: 'anomaly',
            threshold: 0.7,
            action: 'suggest',
          },
        ],
        createdAt: Date.now(),
        lastModified: Date.now(),
      },
    ];

    policies.forEach((p) => this.policies.set(p.id, p));
  }

  /**
   * Generate permission suggestions based on user context and AI^3 analysis
   */
  async generateSuggestions(
    userId: string,
    userName: string,
    roleName: string,
    roleLevel: number,
    department: string,
    outletDepartment: string,
    actions: string[],
    historicalBehavior?: Record<string, any>
  ): Promise<PermissionSuggestion[]> {
    const suggestions: PermissionSuggestion[] = [];

    // Get consistency report from AI3 checker
    const consistencyReport = checkPermissionConsistency(
      userId,
      userName,
      roleName,
      roleLevel,
      department,
      outletDepartment,
      actions
    );

    // Store context in EchoContextCluster
    await this.contextCluster.syncContext('SI', `user-${userId}`, {
      userId,
      userName,
      roleName,
      roleLevel,
      consistencyReport,
      historicalBehavior,
    });

    // Generate suggestions from consistency checks
    for (const check of consistencyReport.checks) {
      const suggestion: PermissionSuggestion = {
        id: `sugg-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        userName,
        action: check.type === 'EXCESSIVE_PERMISSIONS' ? 'revoke' : 'grant',
        permissionKey: check.type,
        permissionName: this.formatPermissionName(check.type),
        reason: check.message,
        confidence: this.calculateConfidence(check, consistencyReport),
        reasoning: await this.buildReasoningChain(
          check,
          consistencyReport,
          historicalBehavior || {}
        ),
        suggestedAt: Date.now(),
        status: 'pending',
      };

      suggestions.push(suggestion);
      this.suggestions.set(suggestion.id, suggestion);

      // Add to reason graph for transparency
      this.reasonGraph.addThought(
        'Echo',
        `SI Suggestion: ${check.message} → ${check.suggestion}`,
        suggestion.confidence
      );
    }

    // Persist suggestions to memory vault
    for (const sugg of suggestions) {
      await this.memoryVault.storeMemory(`suggestion-${sugg.id}`, sugg);
    }

    return suggestions;
  }

  /**
   * Process enforcement based on policies and human decisions
   */
  async processSuggestion(
    suggestionId: string,
    decision: 'accept' | 'reject',
    overriddenBy?: string,
    rejectionReason?: string
  ): Promise<PermissionSuggestion | null> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;

    if (decision === 'accept') {
      suggestion.status = 'enforced';
      suggestion.enforcedAt = Date.now();

      // Log to reason graph
      this.reasonGraph.addThought(
        'Stratus',
        `SI Enforcement Accepted: ${suggestion.permissionName} for ${suggestion.userName}`,
        0.9
      );
    } else {
      suggestion.status = 'rejected';
      suggestion.rejectedAt = Date.now();
      suggestion.rejectionReason = rejectionReason;
      suggestion.overriddenBy = overriddenBy;

      // Log override to reason graph
      this.reasonGraph.addThought(
        'Stratus',
        `SI Enforcement Overridden by ${overriddenBy}: ${suggestion.permissionName}`,
        0.85
      );
    }

    this.enforcementHistory.push(suggestion);
    await this.memoryVault.storeMemory(`suggestion-${suggestionId}`, suggestion);

    return suggestion;
  }

  /**
   * Get all pending suggestions
   */
  getPendingSuggestions(): PermissionSuggestion[] {
    return Array.from(this.suggestions.values()).filter((s) => s.status === 'pending');
  }

  /**
   * Get enforcement history
   */
  getEnforcementHistory(limit = 50): PermissionSuggestion[] {
    return this.enforcementHistory.slice(-limit);
  }

  /**
   * Get policies
   */
  getPolicies(): PermissionEnforcementPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update or create policy
   */
  async upsertPolicy(policy: PermissionEnforcementPolicy): Promise<PermissionEnforcementPolicy> {
    policy.lastModified = Date.now();
    this.policies.set(policy.id, policy);
    await this.memoryVault.storeMemory(`policy-${policy.id}`, policy);
    return policy;
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): PermissionEnforcementPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Check if suggestion should be auto-enforced based on policies
   */
  shouldAutoEnforce(suggestion: PermissionSuggestion): boolean {
    for (const policy of this.policies.values()) {
      if (!policy.enabled || !policy.autoEnforce) continue;

      for (const condition of policy.conditions) {
        if (condition.type === 'anomaly' && suggestion.confidence >= condition.threshold) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Build comprehensive reasoning chain using AI^3
   */
  private async buildReasoningChain(
    check: PermissionCheck,
    report: ConsistencyReport,
    historicalBehavior: Record<string, any>
  ): Promise<ReasoningChain> {
    const contextFactors = await this.extractContextFactors(report, historicalBehavior);
    const anomalies = await this.identifyAnomalies(check, report);
    const patterns = await this.detectHistoricalPatterns(historicalBehavior);
    const recommendations = this.generateRecommendations(check, contextFactors);
    const riskAssessment = this.assessRisk(check, report);

    return {
      contextFactors,
      anomalies,
      historicalPatterns: patterns,
      recommendations,
      riskAssessment,
    };
  }

  private async extractContextFactors(
    report: ConsistencyReport,
    historicalBehavior: Record<string, any>
  ): Promise<string[]> {
    const factors: string[] = [];

    if (report.score < 50) {
      factors.push('Low permission consistency score suggests systematic issues');
    }
    if (report.overallStatus === 'critical') {
      factors.push('Critical permission inconsistencies detected');
    }
    if (historicalBehavior?.frecuentAccessDenials) {
      factors.push('User frequently denied access - may need more permissions');
    }
    if (historicalBehavior?.lastAccessTime && Date.now() - historicalBehavior.lastAccessTime > 30 * 24 * 60 * 60 * 1000) {
      factors.push('User has been inactive - review permissions before re-enabling');
    }

    return factors;
  }

  private async identifyAnomalies(check: PermissionCheck, report: ConsistencyReport): Promise<string[]> {
    const anomalies: string[] = [];

    switch (check.type) {
      case 'SEGREGATION_OF_DUTIES_VIOLATION':
        anomalies.push('Critical: Conflicting responsibilities detected');
        break;
      case 'ROLE_DEPARTMENT_MISMATCH':
        anomalies.push('Role-department misalignment');
        break;
      case 'EXCESSIVE_PERMISSIONS':
        anomalies.push(`Permissions exceed expected level by ${(report.score / 100) * 50}%`);
        break;
      case 'CROSS_DEPARTMENT_ACCESS':
        anomalies.push('Unauthorized cross-department access detected');
        break;
    }

    return anomalies;
  }

  private async detectHistoricalPatterns(historicalBehavior: Record<string, any>): Promise<string[]> {
    const patterns: string[] = [];

    if (historicalBehavior?.accessPatterns) {
      if (historicalBehavior.accessPatterns.offHours) {
        patterns.push('User has pattern of off-hours access');
      }
      if (historicalBehavior.accessPatterns.weekend) {
        patterns.push('User regularly accesses on weekends');
      }
    }

    if (historicalBehavior?.changedDepartments) {
      patterns.push(`User has changed departments ${historicalBehavior.changedDepartments} times`);
    }

    return patterns;
  }

  private generateRecommendations(check: PermissionCheck, factors: string[]): string[] {
    return [check.suggestion];
  }

  private assessRisk(check: PermissionCheck, report: ConsistencyReport): string {
    if (check.severity === 'critical') {
      return 'CRITICAL RISK: Immediate action required';
    }
    if (check.severity === 'warning') {
      return 'HIGH RISK: Review and remediate within 7 days';
    }
    return 'LOW RISK: Monitor and review periodically';
  }

  private calculateConfidence(check: PermissionCheck, report: ConsistencyReport): number {
    const baseConfidence = {
      critical: 0.95,
      warning: 0.75,
      info: 0.5,
    }[check.severity];

    const scoreMultiplier = Math.max(0, report.score / 100);
    return Math.min(1, baseConfidence * (0.5 + scoreMultiplier * 0.5));
  }

  private formatPermissionName(type: string): string {
    return type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
}
