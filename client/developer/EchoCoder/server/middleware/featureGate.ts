import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    org_id?: string;
  };
  org_id?: string;
  subscription_tier?: string;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const featureCache: {
  [key: string]: { enabled: boolean; limits: any; timestamp: number };
} = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if feature is enabled for organization's tier
 */
export async function checkFeatureAccess(
  tier: string,
  feature: string
): Promise<{ enabled: boolean; limits: any }> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const cacheKey = `${tier}:${feature}`;
  const cached = featureCache[cacheKey];

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { enabled: cached.enabled, limits: cached.limits };
  }

  try {
    const { data, error } = await supabase
      .from("tier_features")
      .select("enabled, limits")
      .eq("tier", tier)
      .eq("feature_name", feature)
      .single();

    if (error) {
      console.error("Feature check error:", error);
      return { enabled: false, limits: {} };
    }

    const result = {
      enabled: data?.enabled ?? false,
      limits: data?.limits ?? {},
    };

    featureCache[cacheKey] = {
      ...result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error("Feature access check error:", error);
    return { enabled: false, limits: {} };
  }
}

/**
 * Middleware to gate features based on subscription tier
 */
export function featureGate(requiredFeature: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!supabase) {
        res.status(500).json({ error: "Feature gate not configured" });
        return;
      }

      // Get organization subscription tier
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("subscription_tier")
        .eq("id", req.org_id)
        .single();

      if (orgError || !org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const tier = org.subscription_tier;
      const { enabled, limits } = await checkFeatureAccess(
        tier,
        requiredFeature
      );

      if (!enabled) {
        const tierHierarchy = ["free", "starter", "professional", "enterprise"];
        const nextTierIndex = tierHierarchy.indexOf(tier) + 1;
        const nextTier =
          nextTierIndex < tierHierarchy.length
            ? tierHierarchy[nextTierIndex]
            : "enterprise";

        res.status(403).json({
          error: "Feature not available in your plan",
          feature: requiredFeature,
          currentTier: tier,
          requiredTier: nextTier,
          message: `This feature is available in the ${nextTier} plan and higher.`,
        });
        return;
      }

      // Attach limits to request
      (req as any).featureLimits = limits;

      next();
    } catch (error) {
      console.error("Feature gate error:", error);
      res.status(500).json({ error: "Feature verification failed" });
    }
  };
}

/**
 * Check feature limit (e.g., API calls per day)
 */
export async function checkFeatureLimit(
  orgId: string,
  feature: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (!supabase) {
    return { allowed: true, remaining: limit };
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("usage_metrics")
      .select("usage_count")
      .eq("org_id", orgId)
      .eq("feature_name", feature)
      .eq("period_start", today)
      .eq("period_end", tomorrow)
      .single();

    const used = data?.usage_count ?? 0;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: remaining > 0,
      remaining,
    };
  } catch (error) {
    console.error("Feature limit check error:", error);
    return { allowed: true, remaining: limit };
  }
}

/**
 * Record feature usage
 */
export async function recordFeatureUsage(
  orgId: string,
  feature: string,
  count: number = 1
): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    await supabase.from("usage_metrics").upsert({
      org_id: orgId,
      feature_name: feature,
      period_start: today,
      period_end: tomorrow,
      usage_count: count,
    });
  } catch (error) {
    console.error("Usage recording error:", error);
  }
}

/**
 * List all features for a tier
 */
export async function getTierFeatures(tier: string): Promise<any[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("tier_features")
      .select("*")
      .eq("tier", tier)
      .eq("enabled", true);

    if (error) {
      console.error("Get tier features error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching tier features:", error);
    return [];
  }
}
