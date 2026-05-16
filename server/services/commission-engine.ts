import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";

export type CommissionRule = {
  id: string;
  org_id: string;
  outlet_id?: string | null;
  model: "commission_only" | "salary_plus_commission" | "tiered_accelerator";
  effective_from: string;
  effective_to?: string | null;
  base_salary?: number | null;
  commission_rate?: number | null;
  tiers?: Array<{ threshold: number; rate: number }>;
};

export type CommissionResult = {
  commissionAmount: number;
  model: CommissionRule["model"];
  appliedRate: number;
};

export class CommissionEngine {
  static async getActiveRule(
    orgId: string,
    outletId: string | null,
    date: string,
  ): Promise<CommissionRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    let query = supabase
      .from("crm_commission_rules")
      .select("*")
      .eq("org_id", orgId)
      .lte("effective_from", date)
      .or(`effective_to.is.null,effective_to.gte.${date}`);

    if (outletId) {
      query = query.eq("outlet_id", outletId);
    }

    const { data, error } = await query.order("effective_from", { ascending: false }).limit(1);
    if (error) {
      logger.warn("[Commission] Failed to fetch rule", { error: error.message });
      return null;
    }
    return (data?.[0] as CommissionRule) || null;
  }

  static calculate(revenue: number, rule: CommissionRule | null): CommissionResult {
    if (!rule) {
      return { commissionAmount: 0, model: "commission_only", appliedRate: 0 };
    }

    if (rule.model === "tiered_accelerator" && Array.isArray(rule.tiers)) {
      const tiers = [...rule.tiers].sort((a, b) => a.threshold - b.threshold);
      let appliedRate = rule.commission_rate || 0;
      for (const tier of tiers) {
        if (revenue >= tier.threshold) appliedRate = tier.rate;
      }
      return {
        commissionAmount: revenue * appliedRate,
        model: rule.model,
        appliedRate,
      };
    }

    const rate = rule.commission_rate || 0;
    return { commissionAmount: revenue * rate, model: rule.model, appliedRate: rate };
  }
}
