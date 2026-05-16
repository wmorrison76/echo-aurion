/**
 * Access Control Service (RBAC/ABAC)
 * 
 * TODO-016, TODO-017: Enterprise access control with:
 * - Multi-property/outlet isolation
 * - Policy engine for ABAC (attribute-based access control)
 * - Role-based access control (RBAC)
 * - Tenant isolation enforcement
 * 
 * Integrates with existing auth middleware and tenant validation
 */

import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { logger } from '../lib/logger';

export type Permission = string; // e.g., 'beo:read', 'beo:write', 'recipe:create'
export type Role = string; // e.g., 'chef', 'manager', 'admin'
export type Resource = string; // e.g., 'beo', 'recipe', 'menu'

export interface PolicyRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  effect: 'ALLOW' | 'DENY';
  resources: string[]; // Resource patterns (e.g., 'beo:*', 'recipe:*')
  actions: string[]; // Action patterns (e.g., 'read', 'write', '*')
  conditions?: Record<string, any>; // ABAC conditions (e.g., { department: 'kitchen' })
  priority: number; // Higher priority = evaluated first
}

export interface UserRole {
  user_id: string;
  tenant_id: string;
  role: Role;
  outlet_ids?: string[]; // Outlets user has access to (null = all)
  department_ids?: string[]; // Departments user has access to (null = all)
  metadata?: Record<string, any>;
}

export interface AccessCheck {
  user_id: string;
  tenant_id: string;
  resource: Resource;
  action: string;
  resource_id?: string; // Specific resource ID
  context?: Record<string, any>; // Additional context for ABAC
}

/**
 * Access Control Service
 */
export class AccessControlService {
  private policyCache: Map<string, { policies: PolicyRule[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Check if user has access
   * TODO-016: Multi-property/outlet isolation
   * TODO-017: Policy engine (ABAC)
   */
  async checkAccess(check: AccessCheck): Promise<{
    allowed: boolean;
    reason?: string;
    matchedPolicy?: PolicyRule;
  }> {
    try {
      // Get user roles
      const userRoles = await this.getUserRoles(check.user_id, check.tenant_id);
      if (userRoles.length === 0) {
        return {
          allowed: false,
          reason: 'No roles assigned',
        };
      }

      // Get policies for tenant
      const policies = await this.getPolicies(check.tenant_id);

      // Check each policy
      for (const policy of policies.sort((a, b) => b.priority - a.priority)) {
        if (this.matchesPolicy(check, policy, userRoles)) {
          return {
            allowed: policy.effect === 'ALLOW',
            reason: policy.effect === 'ALLOW' ? 'Policy allows' : 'Policy denies',
            matchedPolicy: policy,
          };
        }
      }

      // Default deny
      return {
        allowed: false,
        reason: 'No matching policy found (default deny)',
      };
    } catch (error) {
      logger.error('[AccessControl] Error checking access', { error, check });
      // Fail secure: deny on error
      return {
        allowed: false,
        reason: 'Error checking access',
      };
    }
  }

  /**
   * Check if access check matches policy
   * TODO-017: Policy engine (ABAC evaluation)
   */
  private matchesPolicy(
    check: AccessCheck,
    policy: PolicyRule,
    userRoles: UserRole[]
  ): boolean {
    // Check resource pattern match
    const resourceMatches = policy.resources.some((pattern) =>
      this.matchesPattern(check.resource, pattern)
    );
    if (!resourceMatches) {
      return false;
    }

    // Check action pattern match
    const actionMatches = policy.actions.some((pattern) =>
      this.matchesPattern(check.action, pattern)
    );
    if (!actionMatches) {
      return false;
    }

    // Check ABAC conditions
    if (policy.conditions) {
      const contextMatches = this.evaluateConditions(
        policy.conditions,
        check.context || {},
        userRoles
      );
      if (!contextMatches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate ABAC conditions
   * TODO-017: Policy engine (ABAC condition evaluation)
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>,
    userRoles: UserRole[]
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key];

      // Simple equality check (can be enhanced with operators like >, <, in, etc.)
      if (actualValue !== expectedValue) {
        // Check if it's a department/outlet access check
        if (key === 'department_id' || key === 'outlet_id') {
          // Check if user has access to this department/outlet
          const hasAccess = userRoles.some((role) => {
            if (key === 'department_id' && role.department_ids) {
              return role.department_ids.includes(expectedValue);
            }
            if (key === 'outlet_id' && role.outlet_ids) {
              return role.outlet_ids.includes(expectedValue);
            }
            // If department_ids/outlet_ids is null, user has access to all
            return !role.department_ids && !role.outlet_ids;
          });
          if (!hasAccess) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if value matches pattern (supports wildcards)
   */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(value);
  }

  /**
   * Get user roles
   * TODO-016: Multi-property/outlet isolation
   */
  async getUserRoles(userId: string, tenantId: string): Promise<UserRole[]> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) {
        logger.error('[AccessControl] Failed to get user roles', { error, user_id: userId });
        throw error;
      }

      return (data || []) as UserRole[];
    } catch (error) {
      logger.error('[AccessControl] Error getting user roles', { error, user_id: userId });
      return [];
    }
  }

  /**
   * Get policies for tenant
   * TODO-017: Policy engine
   */
  async getPolicies(tenantId: string): Promise<PolicyRule[]> {
    // Check cache
    const cacheKey = `policies:${tenantId}`;
    const cached = this.policyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.policies;
    }

    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('access_control_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('[AccessControl] Failed to get policies', { error, tenant_id: tenantId });
        throw error;
      }

      const policies = (data || []) as PolicyRule[];

      // Cache policies
      this.policyCache.set(cacheKey, {
        policies,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      // Clean cache if too large
      if (this.policyCache.size > this.MAX_CACHE_SIZE) {
        const firstKey = this.policyCache.keys().next().value;
        this.policyCache.delete(firstKey);
      }

      return policies;
    } catch (error) {
      logger.error('[AccessControl] Error getting policies', { error, tenant_id: tenantId });
      return [];
    }
  }

  /**
   * Enforce tenant isolation
   * TODO-016: Multi-property/outlet isolation
   */
  async enforceTenantIsolation(
    userId: string,
    tenantId: string,
    resourceTenantId: string
  ): Promise<boolean> {
    if (tenantId !== resourceTenantId) {
      logger.warn('[AccessControl] Tenant isolation violation', {
        user_id: userId,
        user_tenant_id: tenantId,
        resource_tenant_id: resourceTenantId,
      });
      return false;
    }

    return true;
  }

  /**
   * Enforce outlet isolation
   * TODO-016: Multi-property/outlet isolation
   */
  async enforceOutletIsolation(
    userId: string,
    tenantId: string,
    outletId: string
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId, tenantId);

    // Check if user has access to this outlet
    const hasAccess = userRoles.some((role) => {
      // If outlet_ids is null, user has access to all outlets
      if (!role.outlet_ids) {
        return true;
      }
      return role.outlet_ids.includes(outletId);
    });

    if (!hasAccess) {
      logger.warn('[AccessControl] Outlet isolation violation', {
        user_id: userId,
        outlet_id: outletId,
      });
      return false;
    }

    return true;
  }
}

// Singleton instance
export const accessControlService = new AccessControlService();
