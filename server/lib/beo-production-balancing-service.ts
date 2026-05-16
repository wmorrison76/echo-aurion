/**
 * BEO Production Balancing Service
 *
 * Calculates optimized production schedules considering:
 * - Multiple concurrent BEOs (resource contention)
 * - Prep time requirements per recipe
 * - Kitchen station availability
 * - Equipment constraints
 */

import { supabase } from "./supabase";
import { logger } from "./logger";

export interface ProductionScheduleItem {
  id: string;
  itemName: string;
  startTime: string;
  endTime: string;
  station: string;
  prepDuration: number; // minutes
  estArrivalTime: string;
  balancingNotes: string;
}

class BEOProductionBalancingService {
  /**
   * Calculate balanced production schedule for a BEO
   * considering other active events
   */
  async calculateBalancedSchedule(
    beoId: string,
    eventDate: string,
    orgId: string,
  ): Promise<ProductionScheduleItem[]> {
    try {
      logger.info("[PRODUCTION-BALANCING] Calculating schedule:", {
        beoId,
        eventDate,
      });

      // Fetch BEO and related recipes
      const { data: beoData, error: beoError } = await supabase
        .from("beo_banquet_orders")
        .select(
          `
          id,
          event_id,
          content_data,
          beo_recipes (
            recipe_id,
            order_index,
            recipes (
              title,
              prep_time_minutes,
              cook_time_minutes
            )
          )
        `,
        )
        .eq("id", beoId)
        .eq("org_id", orgId)
        .single();

      if (beoError || !beoData) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Fetch other active BEOs on same date/event
      const { data: otherBEOs, error: otherError } = await supabase
        .from("beo_banquet_orders")
        .select(
          `
          id,
          event_id,
          status,
          content_data,
          beo_recipes (
            recipe_id,
            recipes (
              title,
              prep_time_minutes,
              cook_time_minutes
            )
          )
        `,
        )
        .eq("org_id", orgId)
        .eq("event_id", beoData.event_id)
        .neq("id", beoId)
        .in("status", ["active", "confirmed"]);

      if (otherError) {
        logger.warn("[PRODUCTION-BALANCING] Failed to fetch other BEOs:", otherError);
      }

      // Build production schedule with balancing logic
      const schedule = this.buildBalancedSchedule(
        beoData,
        otherBEOs || [],
        eventDate,
      );

      logger.info("[PRODUCTION-BALANCING] Schedule calculated:", {
        beoId,
        itemCount: schedule.length,
      });

      return schedule;
    } catch (err) {
      logger.error("[PRODUCTION-BALANCING] Calculation error:", err);
      return [];
    }
  }

  /**
   * Internal method to build schedule with balancing logic
   */
  private buildBalancedSchedule(
    beo: any,
    otherBEOs: any[],
    eventDate: string,
  ): ProductionScheduleItem[] {
    const schedule: ProductionScheduleItem[] = [];
    const baseTime = new Date(eventDate);

    // Define kitchen stations
    const stations = ["Sauté Station", "Grill", "Pastry", "Sauce", "Plating"];
    let stationIndex = 0;

    // Aggregate prep times from other BEOs
    const otherPrepDemand = new Map<string, number>();
    for (const otherBEO of otherBEOs) {
      for (const recipe of otherBEO.beo_recipes || []) {
        const station = stations[stationIndex % stations.length];
        const prepTime = recipe.recipes?.prep_time_minutes || 0;
        otherPrepDemand.set(
          station,
          (otherPrepDemand.get(station) || 0) + prepTime,
        );
      }
    }

    // Calculate staggered start times for this BEO
    const recipes = beo.beo_recipes || [];
    let cumulativeTime = 0;

    for (const recipeEntry of recipes) {
      const recipe = recipeEntry.recipes;
      if (!recipe) continue;

      const station = stations[stationIndex % stations.length];
      const prepTime = recipe.prep_time_minutes || 0;
      const cookTime = recipe.cook_time_minutes || 0;
      const totalTime = prepTime + cookTime;

      // Calculate start time with buffer for station contention
      const stationLoadFactor =
        (otherPrepDemand.get(station) || 0) / 120; // Normalize to 2-hour window
      const bufferTime = Math.ceil(stationLoadFactor * 15); // 15 min per unit load
      const startTime = new Date(
        baseTime.getTime() + (cumulativeTime + bufferTime) * 60000,
      );
      const endTime = new Date(
        startTime.getTime() + totalTime * 60000,
      );

      // Arrival time is prep time before service
      const estArrivalTime = new Date(
        startTime.getTime() + prepTime * 60000,
      );

      schedule.push({
        id: `sched-${recipeEntry.recipe_id}`,
        itemName: recipe.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        station,
        prepDuration: prepTime,
        estArrivalTime: estArrivalTime.toISOString(),
        balancingNotes: this.generateBalancingNotes(
          station,
          stationLoadFactor,
          bufferTime,
        ),
      });

      cumulativeTime += totalTime + bufferTime;
      stationIndex++;
    }

    return schedule;
  }

  /**
   * Generate human-readable balancing notes
   */
  private generateBalancingNotes(
    station: string,
    loadFactor: number,
    bufferTime: number,
  ): string {
    if (loadFactor > 1.5) {
      return `⚠️ High demand on ${station} (+${bufferTime}min buffer for contention)`;
    } else if (loadFactor > 0.8) {
      return `${station} moderately busy (+${bufferTime}min buffer)`;
    } else {
      return `${station} available as scheduled`;
    }
  }

  /**
   * Optimize multiple concurrent BEOs for kitchen efficiency
   */
  async optimizeMultipleBEOs(
    eventId: string,
    orgId: string,
    eventDate: string,
  ): Promise<Map<string, ProductionScheduleItem[]>> {
    try {
      logger.info("[PRODUCTION-BALANCING] Optimizing multiple BEOs:", {
        eventId,
      });

      const { data: beos, error } = await supabase
        .from("beo_banquet_orders")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("org_id", orgId)
        .in("status", ["active", "confirmed"]);

      if (error || !beos) {
        throw error;
      }

      const scheduleMap = new Map<string, ProductionScheduleItem[]>();

      for (const beo of beos) {
        const schedule = await this.calculateBalancedSchedule(
          beo.id,
          eventDate,
          orgId,
        );
        scheduleMap.set(beo.id, schedule);
      }

      logger.info("[PRODUCTION-BALANCING] Optimization complete:", {
        beoCount: beos.length,
      });

      return scheduleMap;
    } catch (err) {
      logger.error("[PRODUCTION-BALANCING] Optimization error:", err);
      return new Map();
    }
  }
}

export const productionBalancingService = new BEOProductionBalancingService();
