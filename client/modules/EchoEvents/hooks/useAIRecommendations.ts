import { useState, useCallback } from "react";
interface VendorRec {
  vendorId: string;
  vendorName: string;
  category: string;
  matchScore: number;
  costSavings: number;
  quality: number;
  reliability: number;
}
interface PricingRec {
  itemId: string;
  itemName: string;
  currentPrice: number;
  recommendedPrice: number;
  estimatedMarginImprovement: number;
  confidence: number;
}
interface MenuRec {
  itemId: string;
  itemName: string;
  action: "promote" | "price_adjust" | "discontinue" | "add_similar";
  reason: string;
  expectedImpact: string;
  confidence: number;
}
interface Forecast {
  predictedDemand: number;
  confidence: number;
  seasonalFactors: Record<string, number>;
  recommendations: string[];
}
interface UseAIRecommendationsReturn {
  loading: boolean;
  error: string | null;
  getVendorRecommendations: (
    eventId: string,
    category?: string,
  ) => Promise<VendorRec[]>;
  getPricingRecommendations: (eventId: string) => Promise<PricingRec[]>;
  getMenuRecommendations: (eventId: string) => Promise<MenuRec[]>;
  getDemandForecast: (eventId: string) => Promise<Forecast | null>;
}
export const useAIRecommendations = (): UseAIRecommendationsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getVendorRecommendations = useCallback(
    async (eventId: string, category?: string): Promise<VendorRec[]> => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(
          "/api/v1/ai-recommendations/vendors",
          window.location.origin,
        );
        url.searchParams.append("eventId", eventId);
        if (category) url.searchParams.append("category", category);
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) {
          throw new Error(
            `Failed to fetch vendor recommendations: ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result.data || [];
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getPricingRecommendations = useCallback(
    async (eventId: string): Promise<PricingRec[]> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/ai-recommendations/pricing?eventId=${eventId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch pricing recommendations: ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result.data || [];
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getMenuRecommendations = useCallback(
    async (eventId: string): Promise<MenuRec[]> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/ai-recommendations/menu?eventId=${eventId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch menu recommendations: ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result.data || [];
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getDemandForecast = useCallback(
    async (eventId: string): Promise<Forecast | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/ai-recommendations/demand-forecast?eventId=${eventId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch demand forecast: ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  return {
    loading,
    error,
    getVendorRecommendations,
    getPricingRecommendations,
    getMenuRecommendations,
    getDemandForecast,
  };
};
