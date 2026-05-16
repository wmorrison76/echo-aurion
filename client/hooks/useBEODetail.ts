/**
 * Hook for fetching BEO detail data
 */

import { useState, useEffect } from "react";
import { get } from "@/lib/api-client";
import { maestroEventBus, EVENT_TYPES } from "@/lib/maestro-event-bus";

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
  confidence: number;
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
  prepDuration: number;
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

export interface BEODetail {
  beo: BEODetailResponse;
  changelog: ChangelogEntry[];
  aiOrders: AIOrder[];
  productionSchedule: ProductionScheduleItem[];
  inventory: InventoryStatus[];
}

interface UseBEODetailOptions {
  autoFetch?: boolean;
}

export function useBEODetail(
  beoId: string | null,
  options: UseBEODetailOptions = {},
) {
  const { autoFetch = true } = options;
  const [data, setData] = useState<BEODetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!beoId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await get<{ success: boolean; data: BEODetail }>(
        `/api/beo/${beoId}/detail`,
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError("Failed to fetch BEO details");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch BEO details";
      setError(errorMsg);
      console.error("[useBEODetail] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchDetail();
    }
  }, [beoId, autoFetch]);

  // Subscribe to BEO_DETAIL_CHANGED events
  useEffect(() => {
    const unsubscribe = maestroEventBus.subscribeTo(
      EVENT_TYPES.BEO_DETAIL_CHANGED,
      (payload) => {
        if (payload.beoId === beoId) {
          // Refetch when detail changes
          fetchDetail();
        }
      },
    );

    return unsubscribe;
  }, [beoId]);

  return {
    data,
    loading,
    error,
    refetch: fetchDetail,
  };
}
