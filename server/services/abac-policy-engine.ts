/**
 * ABAC (Attribute-Based Access Control) Policy Engine
 * Extends RBAC with fine-grained, context-aware access control using declarative policies
 * 
 * Features:
 * - Policy DSL parser for declarative policy definition
 * - Attribute-based evaluation (user, resource, environment, time-based)
 * - Universal RLS policy generation
 * - Policy caching and optimization
 * - Audit trail for policy evaluations
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Policy DSL Types
 */
export type PolicyOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "startsWith" | "endsWith" | "matches";
export type PolicyLogicalOperator = "AND" | "OR" | "NOT";

export interface PolicyCondition {
  attribute: string; // e.g., "user.role", "resource.outlet_id", "time.hour"
  operator: PolicyOperator;
  value: any;
}

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  effect: "ALLOW" | "DENY";
  conditions: PolicyCondition[];
  logicalOperator?: PolicyLogicalOperator; // Default: AND
  priority?: number; // Higher priority rules evaluated first
}

export interface Policy {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  resourceType: string; // e.g., "recipe", "beo", "purchase_order"
  action: string; // e.g., "read", "write", "delete", "approve"
  rules: PolicyRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEvaluationContext {
  user: {
    id: string;
    orgId: string;
    role: string;
    outletIds?: string[];
    department?: string;
    attributes?: Record<string, any>;
  };
  resource: {
    type: string;
    id?: string;
    outletId?: string;
    department?: string;
    attributes?: Record<string, any>;
  };
  action: string;
  environment?: {
    time?: {
      hour: number;
      dayOfWeek: number;
      date: string;
    };
    ipAddress?: string;
    location?: string;
    deviceType?: string;
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  policyId: string;
  ruleId?: string;
  reason: string;
  evaluationTime: number;
}

/**
 * Policy DSL Parser
 */
export class PolicyDSLParser {
  /**
   * Parse policy DSL string into PolicyRule array
   * 
   * DSL Syntax:
   *   rule_name: effect IF condition1 AND condition2
   *   
   * Examples:
   *   admin_access: ALLOW IF user.role eq "admin"
   *   outlet_access: ALLOW IF user.outlet_ids contains resource.outlet_id
   *   time_restriction: DENY IF time.hour lt 8 OR time.hour gt 22
   */
  static parseDSL(dsl: string): PolicyRule[] {
    const rules: PolicyRule[] = [];
    const lines = dsl.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

    for (const line of lines) {
      try {
        // Parse: rule_name: effect IF conditions
        const match = line.match(/^(\w+):\s*(ALLOW|DENY)\s+IF\s+(.+)$/i);
        if (!match) continue;

        const [, name, effect, conditionsStr] = match;
        const effectUpper = effect.toUpperCase() as "ALLOW" | "DENY";

        // Parse conditions
        const conditions: PolicyCondition[] = [];
        let logicalOp: PolicyLogicalOperator = "AND";

        // Check for logical operators
        if (conditionsStr.includes(" OR ")) {
          logicalOp = "OR";
        } else if (conditionsStr.includes(" AND ")) {
          logicalOp = "AND";
        } else if (conditionsStr.startsWith("NOT ")) {
          logicalOp = "NOT";
        }

        // Parse individual conditions
        const conditionParts = conditionsStr
          .split(/\s+(AND|OR)\s+/i)
          .filter((p) => p && !/^(AND|OR)$/i.test(p));

        for (const part of conditionParts) {
          // Parse: attribute operator value
          const condMatch = part.match(/^([\w.]+)\s+(eq|ne|gt|gte|lt|lte|in|contains|startsWith|endsWith|matches)\s+(.+)$/i);
          if (!condMatch) continue;

          const [, attribute, operator, valueStr] = condMatch;
          const operatorLower = operator.toLowerCase() as PolicyOperator;

          // Parse value (handle strings, numbers, arrays, booleans)
          let value: any = valueStr.trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("[") && value.endsWith("]")) {
            value = JSON.parse(value);
          } else if (value === "true") {
            value = true;
          } else if (value === "false") {
            value = false;
          } else if (!isNaN(Number(value))) {
            value = Number(value);
          }

          conditions.push({ attribute, operator: operatorLower, value });
        }

        if (conditions.length > 0) {
          rules.push({
            id: `rule-${name}`,
            name,
            effect: effectUpper,
            conditions,
            logicalOperator: logicalOp,
            priority: effectUpper === "DENY" ? 100 : 50, // DENY rules have higher priority
          });
        }
      } catch (error) {
        logger.warn("[PolicyDSL] Failed to parse rule", { line, error });
      }
    }

    return rules;
  }

  /**
   * Compile DSL to JSON for storage
   */
  static compileDSL(dsl: string): { rules: PolicyRule[]; compiled: any } {
    const rules = this.parseDSL(dsl);
    return {
      rules,
      compiled: {
        version: "1.0",
        rules: rules.map((r) => ({
          id: r.id,
          name: r.name,
          effect: r.effect,
          conditions: r.conditions,
          logicalOperator: r.logicalOperator || "AND",
          priority: r.priority || 50,
        })),
      },
    };
  }
}

/**
 * ABAC Policy Engine
 */
export class ABACPolicyEngine {
  private policyCache: Map<string, { policy: Policy; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private db: Database) {}

  /**
   * Create or update a policy
   */
  async createPolicy(
    orgId: string,
    name: string,
    resourceType: string,
    action: string,
    dsl: string,
    description?: string,
  ): Promise<Policy> {
    try {
      const { rules, compiled } = PolicyDSLParser.compileDSL(dsl);

      if (rules.length === 0) {
        throw new Error("Policy DSL must contain at least one rule");
      }

      const { data, error } = await supabase
        .from("abac_policies")
        .insert({
          org_id: orgId,
          name,
          description,
          resource_type: resourceType,
          action,
          dsl,
          compiled,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const policy: Policy = {
        id: data.id,
        orgId: data.org_id,
        name: data.name,
        description: data.description || undefined,
        resourceType: data.resource_type,
        action: data.action,
        rules,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Clear cache
      this.policyCache.clear();

      logger.info("[ABAC] Policy created", { policyId: policy.id, orgId, resourceType, action });
      return policy;
    } catch (error) {
      logger.error("[ABAC] Failed to create policy", { error, orgId, name });
      throw error;
    }
  }

  /**
   * Get policy by ID (with caching)
   */
  async getPolicy(policyId: string): Promise<Policy | null> {
    // Check cache
    const cached = this.policyCache.get(policyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.policy;
    }

    try {
      const { data, error } = await supabase
        .from("abac_policies")
        .select("*")
        .eq("id", policyId)
        .eq("is_active", true)
        .single();

      if (error || !data) return null;

      const policy: Policy = {
        id: data.id,
        orgId: data.org_id,
        name: data.name,
        description: data.description || undefined,
        resourceType: data.resource_type,
        action: data.action,
        rules: data.compiled?.rules || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Cache policy
      this.policyCache.set(policyId, {
        policy,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      return policy;
    } catch (error) {
      logger.error("[ABAC] Failed to get policy", { error, policyId });
      return null;
    }
  }

  /**
   * Find applicable policies for a resource type and action
   */
  async findApplicablePolicies(
    orgId: string,
    resourceType: string,
    action: string,
  ): Promise<Policy[]> {
    try {
      const { data, error } = await supabase
        .from("abac_policies")
        .select("*")
        .eq("org_id", orgId)
        .eq("resource_type", resourceType)
        .eq("action", action)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        orgId: d.org_id,
        name: d.name,
        description: d.description || undefined,
        resourceType: d.resource_type,
        action: d.action,
        rules: d.compiled?.rules || [],
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (error) {
      logger.error("[ABAC] Failed to find policies", { error, orgId, resourceType, action });
      return [];
    }
  }

  /**
   * Evaluate a policy rule against context
   */
  private evaluateRule(rule: PolicyRule, context: PolicyEvaluationContext): boolean {
    if (rule.conditions.length === 0) {
      return rule.effect === "ALLOW";
    }

    const results = rule.conditions.map((condition) => {
      const value = this.resolveAttribute(condition.attribute, context);
      return this.evaluateCondition(condition, value);
    });

    // Apply logical operator
    let result: boolean;
    if (rule.logicalOperator === "OR") {
      result = results.some((r) => r);
    } else if (rule.logicalOperator === "NOT") {
      result = !results[0];
    } else {
      // AND (default)
      result = results.every((r) => r);
    }

    return rule.effect === "ALLOW" ? result : !result;
  }

  /**
   * Resolve attribute path to value
   */
  private resolveAttribute(attributePath: string, context: PolicyEvaluationContext): any {
    const parts = attributePath.split(".");
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition, actualValue: any): boolean {
    const { operator, value } = condition;

    if (actualValue === undefined) return false;

    switch (operator) {
      case "eq":
        return actualValue === value;
      case "ne":
        return actualValue !== value;
      case "gt":
        return Number(actualValue) > Number(value);
      case "gte":
        return Number(actualValue) >= Number(value);
      case "lt":
        return Number(actualValue) < Number(value);
      case "lte":
        return Number(actualValue) <= Number(value);
      case "in":
        return Array.isArray(value) && value.includes(actualValue);
      case "contains":
        if (Array.isArray(actualValue)) {
          return actualValue.includes(value);
        }
        return String(actualValue).includes(String(value));
      case "startsWith":
        return String(actualValue).startsWith(String(value));
      case "endsWith":
        return String(actualValue).endsWith(String(value));
      case "matches":
        return new RegExp(String(value)).test(String(actualValue));
      default:
        return false;
    }
  }

  /**
   * Evaluate access request
   */
  async evaluate(context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();

    try {
      // Find applicable policies
      const policies = await this.findApplicablePolicies(
        context.user.orgId,
        context.resource.type,
        context.action,
      );

      if (policies.length === 0) {
        // Default deny if no policy exists
        return {
          allowed: false,
          policyId: "default",
          reason: "No policy found for this resource/action combination",
          evaluationTime: Date.now() - startTime,
        };
      }

      // Evaluate policies in priority order (DENY rules first, then ALLOW)
      const sortedPolicies = policies.sort((a, b) => {
        const aPriority = Math.max(...a.rules.map((r) => r.priority || 50));
        const bPriority = Math.max(...b.rules.map((r) => r.priority || 50));
        return bPriority - aPriority;
      });

      for (const policy of sortedPolicies) {
        // Evaluate all rules in policy (first match wins)
        for (const rule of policy.rules.sort((a, b) => (b.priority || 50) - (a.priority || 50))) {
          const ruleResult = this.evaluateRule(rule, context);
          if (ruleResult) {
            // Rule matched - record evaluation and return
            await this.recordEvaluation(policy.id, rule.id, context, ruleResult);
            return {
              allowed: rule.effect === "ALLOW",
              policyId: policy.id,
              ruleId: rule.id,
              reason: `Policy "${policy.name}", Rule "${rule.name}": ${rule.effect}`,
              evaluationTime: Date.now() - startTime,
            };
          }
        }
      }

      // No rules matched - default deny
      return {
        allowed: false,
        policyId: policies[0].id,
        reason: "No policy rules matched the context",
        evaluationTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("[ABAC] Evaluation failed", { error, context });
      return {
        allowed: false,
        policyId: "error",
        reason: `Evaluation error: ${error}`,
        evaluationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Record policy evaluation for audit
   */
  private async recordEvaluation(
    policyId: string,
    ruleId: string,
    context: PolicyEvaluationContext,
    allowed: boolean,
  ): Promise<void> {
    try {
      await supabase.from("abac_policy_evaluations").insert({
        policy_id: policyId,
        rule_id: ruleId,
        org_id: context.user.orgId,
        user_id: context.user.id,
        resource_type: context.resource.type,
        resource_id: context.resource.id,
        action: context.action,
        allowed,
        context: {
          user: {
            role: context.user.role,
            outletIds: context.user.outletIds,
            department: context.user.department,
          },
          resource: {
            outletId: context.resource.outletId,
            department: context.resource.department,
          },
          environment: context.environment,
        },
        evaluated_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("[ABAC] Failed to record evaluation", { error, policyId });
      // Don't throw - audit logging failure shouldn't block access
    }
  }

  /**
   * Generate RLS policy SQL for a table
   */
  async generateRLSPolicy(
    orgId: string,
    tableName: string,
    resourceType: string,
    action: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL",
  ): Promise<string> {
    const policies = await this.findApplicablePolicies(orgId, resourceType, action.toLowerCase());

    if (policies.length === 0) {
      // Default RLS: tenant isolation only
      return `
        CREATE POLICY ${tableName}_tenant_isolation ON ${tableName}
        FOR ${action}
        USING (org_id = current_setting('app.current_org_id')::uuid);
      `;
    }

    // Build RLS policy from ABAC policies
    const conditions: string[] = [];

    for (const policy of policies) {
      for (const rule of policy.rules) {
        if (rule.effect === "ALLOW") {
          const sqlConditions = rule.conditions.map((cond) => {
            const attribute = cond.attribute.replace(/^resource\./, `${tableName}.`);
            switch (cond.operator) {
              case "eq":
                return `${attribute} = ${this.sqlValue(cond.value)}`;
              case "ne":
                return `${attribute} != ${this.sqlValue(cond.value)}`;
              case "gt":
                return `${attribute} > ${cond.value}`;
              case "gte":
                return `${attribute} >= ${cond.value}`;
              case "lt":
                return `${attribute} < ${cond.value}`;
              case "lte":
                return `${attribute} <= ${cond.value}`;
              case "in":
                return `${attribute} = ANY(${JSON.stringify(cond.value)})`;
              case "contains":
                return `${attribute} @> ${this.sqlValue(cond.value)}`;
              default:
                return "TRUE";
            }
          });

          const sqlOp = rule.logicalOperator === "OR" ? " OR " : " AND ";
          conditions.push(`(${sqlConditions.join(sqlOp)})`);
        }
      }
    }

    if (conditions.length === 0) {
      return `
        CREATE POLICY ${tableName}_tenant_isolation ON ${tableName}
        FOR ${action}
        USING (org_id = current_setting('app.current_org_id')::uuid);
      `;
    }

    // Combine conditions with OR (first match wins)
    const policyCondition = conditions.join(" OR ");

    return `
      CREATE POLICY ${tableName}_abac_policy ON ${tableName}
      FOR ${action}
      USING (
        org_id = current_setting('app.current_org_id')::uuid
        AND (${policyCondition})
      );
    `;
  }

  private sqlValue(value: any): string {
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }
}

// Export singleton instance
export const abacPolicyEngine = new ABACPolicyEngine(null as any); // Will be initialized with actual DB
