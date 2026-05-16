import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  InventoryInsightStatus,
  PhysicalInventoryInsightsResponse,
  StandardCostInsight,
  VoiceInventoryInsight,
} from "@shared/inventory";
interface UsePhysicalInventoryInsightsOptions {
  outletId?: string;
  days?: number;
}
interface UsePhysicalInventoryInsightsResult {
  standardCosts: StandardCostInsight[];
  voiceInsights: VoiceInventoryInsight[];
  status: InventoryInsightStatus;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => void;
}
export function usePhysicalInventoryInsights(
  options: UsePhysicalInventoryInsightsOptions,
): UsePhysicalInventoryInsightsResult {
  const { outletId, days = 30 } = options;
  const [standardCosts, setStandardCosts] = useState<StandardCostInsight[]>([]);
  const [voiceInsights, setVoiceInsights] = useState<VoiceInventoryInsight[]>(
    [],
  );
  const [status, setStatus] = useState<InventoryInsightStatus>("ok");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (outletId && outletId !== "") {
      search.set("outlet", outletId);
    }
    if (Number.isFinite(days) && days > 0) {
      search.set("days", String(days));
    }
    return search;
  }, [outletId, days]);
  const fetchInsights = useCallback(() => {
    abortRef.current?.abort("Physical inventory insights refetch");
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    fetch(`/api/inventory/physical-insights?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return (await response.json()) as PhysicalInventoryInsightsResponse;
      })
      .then((payload) => {
        setStandardCosts(payload.standardCosts ?? []);
        setVoiceInsights(payload.voiceInsights ?? []);
        setStatus(payload.status);
        setErrorMessage(payload.message ?? null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setStandardCosts([]);
        setVoiceInsights([]);
        setStatus("degraded");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load inventory insights",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
  }, [params]);
  useEffect(() => {
    fetchInsights();
    return () => {
      abortRef.current?.abort("Physical inventory insights cleanup");
    };
  }, [fetchInsights]);
  return {
    standardCosts,
    voiceInsights,
    status,
    isLoading,
    errorMessage,
    refresh: fetchInsights,
  };
}
