/**
 * EchoStratus Policy Engine
 * 
 * Governed autonomy with policy-based actions
 * - Policy DSL parser
 * - Policy evaluator
 * - Policy backtesting
 * - Autonomous action execution (safe, governed)
 * 
 * Enterprise-grade: Safe, auditable, reversible actions
 * 
 * All text is i18n-ready
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../../lib/supabase.js';
import { decisionRegistryService } from './decision-registry.js';
import { simulationEngine } from './simulation-engine.js';
import { twinMaterializationService } from './twin-materialization-service.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Policy {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  dsl: string; // Policy DSL code
  compiled?: CompiledPolicy;
  risk_level: 'low' | 'medium' | 'high';
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CompiledPolicy {
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  constraints: PolicyConstraint[];
}

export interface PolicyCondition {
  type: 'metric' | 'anomaly' | 'decision' | 'time';
  metric?: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number | string | [number, number];
}

export interface PolicyAction {
  type: 'create_decision' | 'send_alert' | 'auto_approve' | 'block';
  params: Record<string, any>;
}

export interface PolicyConstraint {
  type: 'max_daily' | 'requires_approval' | 'time_window';
  params: Record<string, any>;
}

export interface PolicyExecution {
  id: string;
  policy_id: string;
  tenant_id: string;
  triggered_at: Date;
  condition_matched: string;
  action_taken: string;
  result: 'success' | 'failed' | 'blocked';
  error?: string;
}

// ============================================================================
// POLICY ENGINE
// ============================================================================

export class PolicyEngine {
  /**
   * Parse policy DSL
   */
  parsePolicyDSL(dsl: string): CompiledPolicy {
    // Simplified DSL parser
    // In production, would use proper parser (PEG.js, etc.)

    const conditions: PolicyCondition[] = [];
    const actions: PolicyAction[] = [];
    const constraints: PolicyConstraint[] = [];

    // Parse conditions (simplified)
    const conditionMatches = dsl.matchAll(/WHEN\s+(\w+)\s+(\w+)\s+([\d.]+)/gi);
    for (const match of conditionMatches) {
      const [, metric, operator, value] = match;
      conditions.push({
        type: 'metric',
        metric,
        operator: operator.toLowerCase() as any,
        value: parseFloat(value),
      });
    }

    // Parse actions (simplified)
    const actionMatches = dsl.matchAll(/THEN\s+(\w+)\s*\(([^)]+)\)/gi);
    for (const match of actionMatches) {
      const [, actionType, paramsStr] = match;
      const params: Record<string, any> = {};
      
      // Parse params (simplified)
      const paramMatches = paramsStr.matchAll(/(\w+):\s*([^,]+)/g);
      for (const paramMatch of paramMatches) {
        const [, key, value] = paramMatch;
        params[key.trim()] = value.trim();
      }

      actions.push({
        type: actionType.toLowerCase() as any,
        params,
      });
    }

    // Parse constraints (simplified)
    const constraintMatches = dsl.matchAll(/CONSTRAINT\s+(\w+)\s*\(([^)]+)\)/gi);
    for (const match of constraintMatches) {
      const [, constraintType, paramsStr] = match;
      const params: Record<string, any> = {};
      
      const paramMatches = paramsStr.matchAll(/(\w+):\s*([^,]+)/g);
      for (const paramMatch of paramMatches) {
        const [, key, value] = paramMatch;
        params[key.trim()] = value.trim();
      }

      constraints.push({
        type: constraintType.toLowerCase() as any,
        params,
      });
    }

    return { conditions, actions, constraints };
  }

  /**
   * Evaluate policy conditions
   */
  async evaluatePolicy(policy: Policy, context: Record<string, any>): Promise<boolean> {
    if (!policy.compiled) {
      policy.compiled = this.parsePolicyDSL(policy.dsl);
    }

    // Evaluate all conditions
    for (const condition of policy.compiled.conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) {
        return false; // Condition not met
      }
    }

    return true; // All conditions met
  }

  /**
   * Evaluate single condition
   */
  private async evaluateCondition(condition: PolicyCondition, context: Record<string, any>): Promise<boolean> {
    if (condition.type === 'metric') {
      const metricValue = context[condition.metric!] || 0;
      const conditionValue = condition.value as number;

      switch (condition.operator) {
        case 'gt':
          return metricValue > conditionValue;
        case 'lt':
          return metricValue < conditionValue;
        case 'eq':
          return metricValue === conditionValue;
        case 'gte':
          return metricValue >= conditionValue;
        case 'lte':
          return metricValue <= conditionValue;
        case 'between':
          const [min, max] = condition.value as [number, number];
          return metricValue >= min && metricValue <= max;
        default:
          return false;
      }
    }

    // Other condition types...
    return false;
  }

  /**
   * Execute policy action
   */
  async executePolicyAction(
    policy: Policy,
    action: PolicyAction,
    context: Record<string, any>
  ): Promise<PolicyExecution> {
    const execution: PolicyExecution = {
      id: require('crypto').randomUUID(),
      policy_id: policy.id,
      tenant_id: policy.tenant_id,
      triggered_at: new Date(),
      condition_matched: JSON.stringify(policy.compiled?.conditions),
      action_taken: action.type,
      result: 'success',
    };

    try {
      // Check constraints
      if (policy.compiled?.constraints) {
        for (const constraint of policy.compiled.constraints) {
          const canExecute = await this.checkConstraint(constraint, policy, context);
          if (!canExecute) {
            execution.result = 'blocked';
            execution.error = `Constraint violated: ${constraint.type}`;
            await this.recordExecution(execution);
            return execution;
          }
        }
      }

      // Execute action
      switch (action.type) {
        case 'create_decision':
          await this.executeCreateDecision(action, context, policy.tenant_id);
          break;

        case 'send_alert':
          await this.executeSendAlert(action, context, policy.tenant_id);
          break;

        case 'auto_approve':
          await this.executeAutoApprove(action, context, policy.tenant_id);
          break;

        case 'block':
          execution.result = 'blocked';
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      await this.recordExecution(execution);
      logger.info(`[Stratus Policy Engine] Executed policy action: ${action.type} (policy: ${policy.name})`);
    } catch (error: any) {
      execution.result = 'failed';
      execution.error = error.message;
      await this.recordExecution(execution);
      logger.error(`[Stratus Policy Engine] Failed to execute action:`, error);
    }

    return execution;
  }

  /**
   * Check constraint
   */
  private async checkConstraint(
    constraint: PolicyConstraint,
    policy: Policy,
    context: Record<string, any>
  ): Promise<boolean> {
    switch (constraint.type) {
      case 'max_daily':
        const maxDaily = constraint.params.max || 10;
        const today = new Date().toISOString().split('T')[0];
        
        const { data: todayExecutions } = await supabase
          .from('stratus_policy_executions')
          .select('id')
          .eq('policy_id', policy.id)
          .gte('triggered_at', `${today}T00:00:00Z`)
          .lt('triggered_at', `${today}T23:59:59Z`);

        return (todayExecutions?.length || 0) < maxDaily;

      case 'requires_approval':
        // Always require approval for high-risk policies
        return policy.risk_level !== 'high';

      case 'time_window':
        const start = constraint.params.start || '00:00';
        const end = constraint.params.end || '23:59';
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return currentTime >= start && currentTime <= end;

      default:
        return true;
    }
  }

  /**
   * Execute create decision action
   */
  private async executeCreateDecision(
    action: PolicyAction,
    context: Record<string, any>,
    tenantId: string
  ): Promise<void> {
    const decisionType = action.params.decision_type || 'unknown';
    const title = action.params.title || 'Auto-generated decision';
    const description = action.params.description || 'Created by policy engine';

    await decisionRegistryService.createExplicitDecision(
      tenantId,
      decisionType as any,
      title,
      description,
      'system',
      action.params.target_entity_ids || [],
      {
        policy_generated: true,
        policy_id: action.params.policy_id,
      }
    );
  }

  /**
   * Execute send alert action
   */
  private async executeSendAlert(
    action: PolicyAction,
    context: Record<string, any>,
    tenantId: string
  ): Promise<void> {
    // Would integrate with notification service
    logger.info(`[Stratus Policy Engine] Alert: ${action.params.message}`);
  }

  /**
   * Execute auto approve action
   */
  private async executeAutoApprove(
    action: PolicyAction,
    context: Record<string, any>,
    tenantId: string
  ): Promise<void> {
    const decisionId = action.params.decision_id;
    if (decisionId) {
      await decisionRegistryService.updateDecisionStatus(decisionId, 'approved');
    }
  }

  /**
   * Record execution
   */
  private async recordExecution(execution: PolicyExecution): Promise<void> {
    await supabase
      .from('stratus_policy_executions')
      .insert({
        id: execution.id,
        policy_id: execution.policy_id,
        tenant_id: execution.tenant_id,
        triggered_at: execution.triggered_at.toISOString(),
        condition_matched: execution.condition_matched,
        action_taken: execution.action_taken,
        result: execution.result,
        error: execution.error,
      });
  }

  /**
   * Backtest policy
   */
  async backtestPolicy(policy: Policy, from: Date, to: Date): Promise<{
    hitRate: number;
    falsePositiveRate: number;
    roi: number;
    riskScore: number;
  }> {
    // Get historical data
    const twin = await twinMaterializationService.materializeTwin(policy.tenant_id);

    // Simulate policy execution over historical period
    let hits = 0;
    let falsePositives = 0;
    let totalExecutions = 0;

    // Simplified backtesting
    // In production, would use actual historical data

    const hitRate = totalExecutions > 0 ? hits / totalExecutions : 0;
    const falsePositiveRate = totalExecutions > 0 ? falsePositives / totalExecutions : 0;
    const roi = 0; // Would calculate from actual outcomes
    const riskScore = policy.risk_level === 'high' ? 0.8 : policy.risk_level === 'medium' ? 0.5 : 0.2;

    return {
      hitRate,
      falsePositiveRate,
      roi,
      riskScore,
    };
  }
}

// Export singleton instance
export const policyEngine = new PolicyEngine();
