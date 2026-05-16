import { logger } from "../lib/logger";
import { getSupabaseServiceClient } from "../lib/supabase-service-client.js";

interface EnrichmentResult {
  suggestedGuestCount: number;
  suggestedRevenue: number;
  revenueBreakdown: {
    foodBeverage: number;
    roomFee: number;
    serviceCharge: number;
    taxes: number;
  };
  confidence: number;
  historicalData: {
    avgGuestCount: number;
    avgRevenuePerGuest: number;
    eventCount: number;
  };
}

/**
 * AI Enrichment Service for Prospects
 * Calculates guest count and revenue estimates based on event type and historical data
 */
class ProspectAIEnrichmentService {
  /**
   * Default averages by event type (used as baseline if no historical data)
   */
  private defaultAverages: Record<
    string,
    { guestCount: number; revenuePerGuest: number }
  > = {
    WED: { guestCount: 120, revenuePerGuest: 250 },
    COR: { guestCount: 80, revenuePerGuest: 200 },
    BAN: { guestCount: 100, revenuePerGuest: 220 },
    SEM: { guestCount: 40, revenuePerGuest: 150 },
    OTH: { guestCount: 60, revenuePerGuest: 180 },
  };

  /**
   * Suggest guest count based on event type and historical data
   */
  async suggestGuestCount(
    eventTypeCode: string,
    orgId: string,
    outletId: string,
  ): Promise<{ suggested: number; confidence: number }> {
    try {
      const defaultValue = this.defaultAverages[eventTypeCode];
      if (!defaultValue) {
        return {
          suggested: this.defaultAverages.OTH.guestCount,
          confidence: 0.7,
        };
      }

      // Try to fetch historical data from past events that reached won/BEO (heuristic for "completed")
      const supabase = getSupabaseServiceClient();
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: historicalEvents, error } = await supabase
        .from("prospects")
        .select("guest_count,event_date,status")
        .eq("org_id", orgId)
        .eq("outlet_id", outletId)
        .eq("event_type_code", eventTypeCode)
        .in("status", ["won", "beo_created"])
        .lt("event_date", todayIso)
        .not("guest_count", "is", null);

      if (!error && historicalEvents && historicalEvents.length > 0) {
        const avgGuestCount = Math.round(
          historicalEvents.reduce((sum, e) => sum + (e.guest_count || 0), 0) /
            historicalEvents.length,
        );

        return {
          suggested: avgGuestCount,
          confidence: Math.min(0.95, 0.6 + historicalEvents.length * 0.05),
        };
      }

      // Fallback to default
      return {
        suggested: defaultValue.guestCount,
        confidence: 0.7,
      };
    } catch (error) {
      logger.error("[ProspectAIEnrichment] suggestGuestCount error", {
        error: error instanceof Error ? error.message : String(error),
      });
      const defaultValue =
        this.defaultAverages[eventTypeCode] || this.defaultAverages.OTH;
      return {
        suggested: defaultValue.guestCount,
        confidence: 0.6,
      };
    }
  }

  /**
   * Calculate suggested revenue based on event details
   */
  async suggestRevenue(
    eventTypeCode: string,
    guestCount: number,
    orgId: string,
    outletId: string,
  ): Promise<EnrichmentResult> {
    try {
      const defaultValue =
        this.defaultAverages[eventTypeCode] || this.defaultAverages.OTH;

      // Fetch historical revenue data
      let avgRevenuePerGuest = defaultValue.revenuePerGuest;
      let historicalEventCount = 0;
      let avgGuestCount = defaultValue.guestCount;

      const supabase = getSupabaseServiceClient();
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: historicalEvents, error } = await supabase
        .from("prospects")
        .select("estimated_revenue, guest_count, event_date, status")
        .eq("org_id", orgId)
        .eq("outlet_id", outletId)
        .eq("event_type_code", eventTypeCode)
        .in("status", ["won", "beo_created"])
        .lt("event_date", todayIso)
        .not("estimated_revenue", "is", null)
        .not("guest_count", "is", null);

      if (!error && historicalEvents && historicalEvents.length > 0) {
        historicalEventCount = historicalEvents.length;

        const totalRevenue = historicalEvents.reduce(
          (sum, e) => sum + (e.estimated_revenue || 0),
          0,
        );
        const totalGuests = historicalEvents.reduce(
          (sum, e) => sum + (e.guest_count || 0),
          0,
        );

        avgRevenuePerGuest = totalGuests > 0 ? Math.round(totalRevenue / totalGuests) : avgRevenuePerGuest;
        avgGuestCount = Math.round(totalGuests / historicalEventCount);
      }

      // Calculate revenue breakdown
      const baseRevenue = guestCount * avgRevenuePerGuest;

      // Breakdown estimates
      const foodBeverage = Math.round(baseRevenue * 0.65); // ~65% food & beverage
      const roomFee = Math.round(baseRevenue * 0.15); // ~15% room fee
      const serviceCharge = Math.round(baseRevenue * 0.15); // ~15% service charge
      const taxes = Math.round((foodBeverage + serviceCharge) * 0.08); // ~8% tax on F&B + service

      const totalRevenue = foodBeverage + roomFee + serviceCharge + taxes;

      const confidence =
        historicalEventCount > 0
          ? Math.min(0.95, 0.6 + historicalEventCount * 0.05)
          : 0.6;

      return {
        suggestedGuestCount: guestCount,
        suggestedRevenue: totalRevenue,
        revenueBreakdown: {
          foodBeverage,
          roomFee,
          serviceCharge,
          taxes,
        },
        confidence,
        historicalData: {
          avgGuestCount,
          avgRevenuePerGuest,
          eventCount: historicalEventCount,
        },
      };
    } catch (error) {
      logger.error("[ProspectAIEnrichment] suggestRevenue error", {
        error: error instanceof Error ? error.message : String(error),
      });

      const defaultValue =
        this.defaultAverages[eventTypeCode] || this.defaultAverages.OTH;
      const baseRevenue = guestCount * defaultValue.revenuePerGuest;

      return {
        suggestedGuestCount: guestCount,
        suggestedRevenue: Math.round(baseRevenue * 1.08), // With 8% tax
        revenueBreakdown: {
          foodBeverage: Math.round(baseRevenue * 0.65),
          roomFee: Math.round(baseRevenue * 0.15),
          serviceCharge: Math.round(baseRevenue * 0.15),
          taxes: Math.round(baseRevenue * 0.08),
        },
        confidence: 0.5,
        historicalData: {
          avgGuestCount: defaultValue.guestCount,
          avgRevenuePerGuest: defaultValue.revenuePerGuest,
          eventCount: 0,
        },
      };
    }
  }

  /**
   * Full enrichment: suggest guest count and revenue for a prospect
   */
  async enrichProspect(
    prospectId: string,
    eventTypeCode: string,
    orgId: string,
    outletId: string,
  ): Promise<{ guestCount: number; revenue: number } | null> {
    try {
      // Get guest count suggestion
      const guestCountResult = await this.suggestGuestCount(
        eventTypeCode,
        orgId,
        outletId,
      );

      // Get revenue suggestion
      const revenueResult = await this.suggestRevenue(
        eventTypeCode,
        guestCountResult.suggested,
        orgId,
        outletId,
      );

      // Update prospect in database
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from("prospects")
        .update({
          guest_count: guestCountResult.suggested,
          estimated_revenue: revenueResult.suggestedRevenue,
        })
        .eq("id", prospectId)
        .eq("org_id", orgId);

      if (error) {
        logger.error("[ProspectAIEnrichment] Failed to update prospect", {
          error: error.message,
          prospectId,
        });
        return null;
      }

      logger.info("[ProspectAIEnrichment] Prospect enriched", {
        prospectId,
        guestCount: guestCountResult.suggested,
        revenue: revenueResult.suggestedRevenue,
      });

      return {
        guestCount: guestCountResult.suggested,
        revenue: revenueResult.suggestedRevenue,
      };
    } catch (error) {
      logger.error("[ProspectAIEnrichment] enrichProspect error", {
        error: error instanceof Error ? error.message : String(error),
        prospectId,
      });
      return null;
    }
  }
}

export const prospectAIEnrichmentService = new ProspectAIEnrichmentService();
