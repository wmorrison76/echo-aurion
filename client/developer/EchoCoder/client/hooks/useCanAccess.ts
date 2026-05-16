import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

export interface FeatureAccessResult {
  canAccess: boolean;
  tier: string;
  feature: string;
  limits?: Record<string, any>;
  requiredTier?: string;
  message?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Hook to check if current user can access a feature
 */
export function useCanAccess(feature: string): FeatureAccessResult {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: orgData } = useQuery({
    queryKey: ["organization", session?.user?.id],
    queryFn: async () => {
      if (!supabase || !session) return null;

      const { data } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .eq("status", "accepted")
        .single();

      if (!data) return null;

      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_tier")
        .eq("id", data.org_id)
        .single();

      return org;
    },
  });

  const { data: featureData } = useQuery({
    queryKey: ["feature-access", orgData?.subscription_tier, feature],
    queryFn: async () => {
      if (!supabase || !orgData) return null;

      const { data } = await supabase
        .from("tier_features")
        .select("enabled, limits")
        .eq("tier", orgData.subscription_tier)
        .eq("feature_name", feature)
        .single();

      return data;
    },
  });

  if (!session || !orgData || !featureData) {
    return {
      canAccess: false,
      tier: "unknown",
      feature,
      message: "Not authenticated",
    };
  }

  const tier = orgData.subscription_tier;
  const canAccess = featureData?.enabled ?? false;

  if (!canAccess) {
    const tierHierarchy = ["free", "starter", "professional", "enterprise"];
    const nextTierIndex = tierHierarchy.indexOf(tier) + 1;
    const nextTier =
      nextTierIndex < tierHierarchy.length
        ? tierHierarchy[nextTierIndex]
        : "enterprise";

    return {
      canAccess: false,
      tier,
      feature,
      requiredTier: nextTier,
      message: `This feature is available in the ${nextTier} plan and higher`,
    };
  }

  return {
    canAccess: true,
    tier,
    feature,
    limits: featureData?.limits,
  };
}

/**
 * Hook to check if user has specific role in organization
 */
export function useOrgRole(requiredRoles?: string[]) {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: role } = useQuery({
    queryKey: ["org-role", session?.user?.id],
    queryFn: async () => {
      if (!supabase || !session) return null;

      // Get user's organization
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("status", "accepted")
        .single();

      return memberData?.role || null;
    },
  });

  if (!role) {
    return { hasRole: false, role: null, isAdmin: false, isManager: false };
  }

  const hasRole =
    !requiredRoles || requiredRoles.includes(role);
  const isAdmin = role === "admin";
  const isManager = role === "manager" || isAdmin;

  return { hasRole, role, isAdmin, isManager };
}

/**
 * Hook to check feature usage limits
 */
export function useFeatureLimit(feature: string) {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: orgData } = useQuery({
    queryKey: ["organization", session?.user?.id],
    queryFn: async () => {
      if (!supabase || !session) return null;

      const { data } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .eq("status", "accepted")
        .single();

      return data;
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const { data: usage } = useQuery({
    queryKey: ["feature-usage", orgData?.org_id, feature, today],
    queryFn: async () => {
      if (!supabase || !orgData) return null;

      const tomorrow = new Date(Date.now() + 86400000)
        .toISOString()
        .split("T")[0];

      const { data } = await supabase
        .from("usage_metrics")
        .select("usage_count")
        .eq("org_id", orgData.org_id)
        .eq("feature_name", feature)
        .eq("period_start", today)
        .eq("period_end", tomorrow)
        .single();

      return data?.usage_count ?? 0;
    },
  });

  return {
    usage: usage ?? 0,
    isNearLimit: (usage ?? 0) > 80,
    isLimitReached: (usage ?? 0) >= 100,
  };
}

/**
 * Hook to get all available features for current tier
 */
export function useTierFeatures() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: orgData } = useQuery({
    queryKey: ["organization", session?.user?.id],
    queryFn: async () => {
      if (!supabase || !session) return null;

      const { data } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .eq("status", "accepted")
        .single();

      if (!data) return null;

      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_tier")
        .eq("id", data.org_id)
        .single();

      return org;
    },
  });

  const { data: features } = useQuery({
    queryKey: ["tier-features", orgData?.subscription_tier],
    queryFn: async () => {
      if (!supabase || !orgData) return [];

      const { data } = await supabase
        .from("tier_features")
        .select("*")
        .eq("tier", orgData.subscription_tier)
        .eq("enabled", true);

      return data || [];
    },
  });

  return {
    tier: orgData?.subscription_tier || "free",
    features: features || [],
  };
}
