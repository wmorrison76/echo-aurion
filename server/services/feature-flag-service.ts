/**
 * Feature Flag Service
 * Enables runtime feature toggling without deployment
 * 
 * Features:
 * - Feature flag management (enable/disable features)
 * - Percentage rollouts
 * - User/org targeting
 * - Time-based flags
 * - Audit trail
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Feature Flag Types
 */
export type FeatureFlagTargetType = "all" | "percentage" | "org_ids" | "user_ids" | "experiment";
export type FeatureFlagStatus = "enabled" | "disabled" | "experiment";

export interface FeatureFlag {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  status: FeatureFlagStatus;
  targetType: FeatureFlagTargetType;
  targetConfig?: {
    percentage?: number; // 0-100 for percentage rollouts
    orgIds?: string[]; // Specific org IDs
    userIds?: string[]; // Specific user IDs
    experimentGroup?: string; // A/B test group
  };
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagEvaluation {
  flagName: string;
  enabled: boolean;
  reason: string;
  variant?: string; // For experiments
}

/**
 * Feature Flag Service
 */
export class FeatureFlagService {
  private flagCache: Map<string, { flag: FeatureFlag; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 1 * 60 * 1000; // 1 minute

  /**
   * Create or update a feature flag
   */
  async setFlag(
    name: string,
    status: FeatureFlagStatus,
    targetType: FeatureFlagTargetType = "all",
    targetConfig?: FeatureFlag["targetConfig"],
    displayName?: string,
    description?: string,
  ): Promise<FeatureFlag> {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .upsert(
          {
            name,
            display_name: displayName || name,
            description: description || null,
            status,
            target_type: targetType,
            target_config: targetConfig || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "name",
          },
        )
        .select()
        .single();

      if (error) throw error;

      const flag: FeatureFlag = {
        id: data.id,
        name: data.name,
        displayName: data.display_name,
        description: data.description || undefined,
        status: data.status,
        targetType: data.target_type,
        targetConfig: data.target_config || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        metadata: data.metadata || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Clear cache
      this.flagCache.delete(name);

      logger.info("[FeatureFlags] Flag updated", { name, status });
      return flag;
    } catch (error) {
      logger.error("[FeatureFlags] Failed to set flag", { error, name });
      throw error;
    }
  }

  /**
   * Get feature flag by name (with caching)
   */
  async getFlag(name: string): Promise<FeatureFlag | null> {
    // Check cache
    const cached = this.flagCache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.flag;
    }

    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("name", name)
        .single();

      if (error || !data) return null;

      const flag: FeatureFlag = {
        id: data.id,
        name: data.name,
        displayName: data.display_name,
        description: data.description || undefined,
        status: data.status,
        targetType: data.target_type,
        targetConfig: data.target_config || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        metadata: data.metadata || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Cache flag
      this.flagCache.set(name, {
        flag,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      return flag;
    } catch (error) {
      logger.error("[FeatureFlags] Failed to get flag", { error, name });
      return null;
    }
  }

  /**
   * Evaluate if a feature flag is enabled for a given context
   */
  async isEnabled(
    flagName: string,
    context?: {
      orgId?: string;
      userId?: string;
    },
  ): Promise<FeatureFlagEvaluation> {
    const flag = await this.getFlag(flagName);

    if (!flag) {
      return {
        flagName,
        enabled: false,
        reason: "Feature flag not found",
      };
    }

    // Check if flag is explicitly disabled
    if (flag.status === "disabled") {
      return {
        flagName,
        enabled: false,
        reason: "Feature flag is disabled",
      };
    }

    // Check date range
    const now = new Date();
    if (flag.startDate && new Date(flag.startDate) > now) {
      return {
        flagName,
        enabled: false,
        reason: `Feature flag starts at ${flag.startDate}`,
      };
    }

    if (flag.endDate && new Date(flag.endDate) < now) {
      return {
        flagName,
        enabled: false,
        reason: `Feature flag ended at ${flag.endDate}`,
      };
    }

    // Evaluate based on target type
    switch (flag.targetType) {
      case "all":
        return {
          flagName,
          enabled: flag.status === "enabled",
          reason: flag.status === "enabled" ? "Feature flag enabled for all" : "Feature flag status is experiment",
        };

      case "percentage":
        if (!flag.targetConfig?.percentage) {
          return {
            flagName,
            enabled: false,
            reason: "Percentage rollout not configured",
          };
        }

        // Deterministic hash-based percentage (same user always gets same result)
        const hashInput = context?.userId || context?.orgId || Math.random().toString();
        const hash = this.hashString(hashInput);
        const percentage = (hash % 100) + 1;

        const enabled = percentage <= flag.targetConfig.percentage;
        return {
          flagName,
          enabled,
          reason: enabled
            ? `User in ${flag.targetConfig.percentage}% rollout (hash: ${percentage})`
            : `User not in ${flag.targetConfig.percentage}% rollout (hash: ${percentage})`,
        };

      case "org_ids":
        if (!context?.orgId) {
          return {
            flagName,
            enabled: false,
            reason: "Org ID required for org-based targeting",
          };
        }

        const orgEnabled = flag.targetConfig?.orgIds?.includes(context.orgId) || false;
        return {
          flagName,
          enabled: orgEnabled && flag.status === "enabled",
          reason: orgEnabled
            ? `Org ${context.orgId} in target list`
            : `Org ${context.orgId} not in target list`,
        };

      case "user_ids":
        if (!context?.userId) {
          return {
            flagName,
            enabled: false,
            reason: "User ID required for user-based targeting",
          };
        }

        const userEnabled = flag.targetConfig?.userIds?.includes(context.userId) || false;
        return {
          flagName,
          enabled: userEnabled && flag.status === "enabled",
          reason: userEnabled
            ? `User ${context.userId} in target list`
            : `User ${context.userId} not in target list`,
        };

      case "experiment":
        if (!context?.userId) {
          return {
            flagName,
            enabled: false,
            reason: "User ID required for experiments",
          };
        }

        // Assign user to experiment group (A/B test)
        const variant = this.getExperimentVariant(context.userId, flagName);
        const experimentEnabled = flag.status === "enabled" || flag.status === "experiment";

        return {
          flagName,
          enabled: experimentEnabled,
          reason: `User in experiment group: ${variant}`,
          variant,
        };

      default:
        return {
          flagName,
          enabled: false,
          reason: `Unknown target type: ${flag.targetType}`,
        };
    }
  }

  /**
   * Hash string to number (0-99)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Get experiment variant for a user (A/B test)
   */
  private getExperimentVariant(userId: string, flagName: string): string {
    const hash = this.hashString(`${userId}:${flagName}`);
    return hash % 2 === 0 ? "control" : "treatment";
  }

  /**
   * List all feature flags
   */
  async listFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        name: d.name,
        displayName: d.display_name,
        description: d.description || undefined,
        status: d.status,
        targetType: d.target_type,
        targetConfig: d.target_config || undefined,
        startDate: d.start_date || undefined,
        endDate: d.end_date || undefined,
        metadata: d.metadata || undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (error) {
      logger.error("[FeatureFlags] Failed to list flags", { error });
      return [];
    }
  }

  /**
   * Record feature flag evaluation for analytics
   */
  async recordEvaluation(
    flagName: string,
    enabled: boolean,
    context?: {
      orgId?: string;
      userId?: string;
    },
  ): Promise<void> {
    try {
      await supabase.from("feature_flag_evaluations").insert({
        flag_name: flagName,
        org_id: context?.orgId || null,
        user_id: context?.userId || null,
        enabled,
        evaluated_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("[FeatureFlags] Failed to record evaluation", { error, flagName });
      // Don't throw - analytics logging failure shouldn't block feature access
    }
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
