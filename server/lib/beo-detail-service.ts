/**
 * BEO Detail Service
 *
 * Aggregates and hydrates BEO data for the Maestro Dashboard detail view.
 * Fetches changelog, AI orders, production schedule, and inventory status.
 */

import { supabase } from "./supabase";
import { logger } from "./logger";

export interface BEODetailResponse {
  beoId: string;
  beoNumber: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  guaranteedGuests: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  salespersonName?: string;
  status: string;
  outletId?: string;
}

export interface ChangelogEntry {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  changedBy?: string;
  beforeValue?: any;
  afterValue?: any;
}

export interface AIOrder {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  confidence: number; // 0-100
  proposed: boolean;
  approved: boolean;
  feedback?: string;
}

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

export interface InventoryStatus {
  itemName: string;
  onHand: number;
  unit: string;
  pendingDelivery: number;
  estimatedArrival?: string;
  status: "covered" | "tight" | "short";
}

export interface BEODetailData {
  beo: BEODetailResponse;
  changelog: ChangelogEntry[];
  aiOrders: AIOrder[];
  productionSchedule: ProductionScheduleItem[];
  inventory: InventoryStatus[];
}

class BEODetailService {
  /**
   * Fetch complete BEO detail data
   */
  async fetchBEODetail(beoId: string, orgId: string): Promise<BEODetailData> {
    try {
      logger.info("[BEO-DETAIL] Fetching BEO:", { beoId, orgId });

      // Fetch BEO from database
      const { data: beoData, error: beoError } = await supabase
        .from("beo_banquet_orders")
        .select(
          `
          id,
          beo_number,
          event_id,
          status,
          outlet_id,
          content_data,
          created_at,
          updated_at
        `,
        )
        .eq("id", beoId)
        .eq("org_id", orgId)
        .single();

      if (beoError || !beoData) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Fetch related event data
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(
          `
          id,
          name,
          date,
          guest_count,
          guaranteed_guests,
          client_name,
          client_email,
          client_phone,
          salesperson_id
        `,
        )
        .eq("id", beoData.event_id)
        .single();

      if (eventError) {
        logger.warn("[BEO-DETAIL] Event not found, using BEO data only");
      }

      // Fetch salesperson if available
      let salespersonName = undefined;
      if (eventData?.salesperson_id) {
        const { data: salesData } = await supabase
          .from("employees")
          .select("full_name")
          .eq("id", eventData.salesperson_id)
          .single();
        salespersonName = salesData?.full_name;
      }

      // Build BEO response
      const beo: BEODetailResponse = {
        beoId: beoData.id,
        beoNumber: beoData.beo_number,
        eventId: beoData.event_id,
        eventName: eventData?.name || "Unknown Event",
        eventDate: eventData?.date || new Date().toISOString(),
        guestCount: eventData?.guest_count || 0,
        guaranteedGuests: eventData?.guaranteed_guests || 0,
        clientName: eventData?.client_name,
        clientEmail: eventData?.client_email,
        clientPhone: eventData?.client_phone,
        salespersonName,
        status: beoData.status,
        outletId: beoData.outlet_id,
      };

      // Fetch related data in parallel
      const [changelogData, aiOrdersData, prodScheduleData, inventoryData] =
        await Promise.all([
          this.fetchChangelog(beoId, orgId),
          this.fetchAIOrders(beoId, orgId),
          this.fetchProductionSchedule(beoId, orgId),
          this.fetchInventoryStatus(beoId, orgId),
        ]);

      return {
        beo,
        changelog: changelogData,
        aiOrders: aiOrdersData,
        productionSchedule: prodScheduleData,
        inventory: inventoryData,
      };
    } catch (err) {
      logger.error("[BEO-DETAIL] fetchBEODetail error:", err);
      throw err;
    }
  }

  /**
   * Fetch changelog for BEO (timestamped changes)
   */
  private async fetchChangelog(
    beoId: string,
    orgId: string,
  ): Promise<ChangelogEntry[]> {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .select(
          `
          id,
          timestamp,
          field,
          before_value,
          after_value,
          changed_by_user_id
        `,
        )
        .eq("beo_id", beoId)
        .eq("org_id", orgId)
        .order("timestamp", { ascending: false })
        .limit(50);

      if (error) {
        logger.warn("[BEO-DETAIL] Changelog query error:", error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        type: entry.field || "unknown",
        description: this.formatChangeDescription(
          entry.field,
          entry.before_value,
          entry.after_value,
        ),
        changedBy: entry.changed_by_user_id,
        beforeValue: entry.before_value,
        afterValue: entry.after_value,
      }));
    } catch (err) {
      logger.warn("[BEO-DETAIL] fetchChangelog error:", err);
      return [];
    }
  }

  /**
   * Fetch AI-generated orders for BEO
   */
  private async fetchAIOrders(
    beoId: string,
    orgId: string,
  ): Promise<AIOrder[]> {
    try {
      const { data, error } = await supabase
        .from("beo_ai_orders")
        .select("*")
        .eq("beo_id", beoId)
        .eq("org_id", orgId);

      if (error) {
        logger.warn("[BEO-DETAIL] AI Orders query error:", error);
        return [];
      }

      return (data || []).map((order: any) => ({
        id: order.id,
        itemName: order.item_name,
        quantity: order.quantity,
        unit: order.unit || "unit",
        confidence: order.confidence_percent || 0,
        proposed: order.proposed || false,
        approved: order.approved || false,
        feedback: order.feedback,
      }));
    } catch (err) {
      logger.warn("[BEO-DETAIL] fetchAIOrders error:", err);
      return [];
    }
  }

  /**
   * Fetch production schedule for BEO
   */
  private async fetchProductionSchedule(
    beoId: string,
    orgId: string,
  ): Promise<ProductionScheduleItem[]> {
    try {
      const { data, error } = await supabase
        .from("production_breakdown")
        .select("*")
        .eq("beo_id", beoId)
        .eq("org_id", orgId)
        .order("start_time", { ascending: true });

      if (error) {
        logger.warn("[BEO-DETAIL] Production schedule query error:", error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        itemName: item.menu_item || "Unknown Item",
        startTime: item.start_time,
        endTime: item.end_time,
        station: item.station || "general",
        prepDuration: item.prep_duration_minutes || 0,
        estArrivalTime: item.arrival_time,
        balancingNotes: `Prep window available`,
      }));
    } catch (err) {
      logger.warn("[BEO-DETAIL] fetchProductionSchedule error:", err);
      return [];
    }
  }

  /**
   * Fetch inventory status for BEO
   */
  private async fetchInventoryStatus(
    beoId: string,
    orgId: string,
  ): Promise<InventoryStatus[]> {
    try {
      const { data, error } = await supabase
        .from("inventory_delta")
        .select(
          `
          id,
          item_name,
          quantity_required,
          quantity_on_hand,
          quantity_pending,
          estimated_arrival,
          unit
        `,
        )
        .eq("beo_id", beoId)
        .eq("org_id", orgId);

      if (error) {
        logger.warn("[BEO-DETAIL] Inventory query error:", error);
        return [];
      }

      return (data || []).map((item: any) => {
        const shortage =
          item.quantity_required -
          item.quantity_on_hand -
          item.quantity_pending;
        let status: "covered" | "tight" | "short" = "covered";
        if (shortage > 0) {
          status = "short";
        } else if (item.quantity_on_hand < item.quantity_required * 0.2) {
          status = "tight";
        }

        return {
          itemName: item.item_name,
          onHand: item.quantity_on_hand || 0,
          unit: item.unit || "unit",
          pendingDelivery: item.quantity_pending || 0,
          estimatedArrival: item.estimated_arrival,
          status,
        };
      });
    } catch (err) {
      logger.warn("[BEO-DETAIL] fetchInventoryStatus error:", err);
      return [];
    }
  }

  /**
   * Format change description from field and values
   */
  private formatChangeDescription(
    field: string,
    beforeValue: any,
    afterValue: any,
  ): string {
    if (!field) return "Unknown change";

    // Format field name (snake_case to Title Case)
    const fieldName = field
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return `${fieldName}: ${beforeValue} → ${afterValue}`;
  }
}

export const beoDetailService = new BEODetailService();
