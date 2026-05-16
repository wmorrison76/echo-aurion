/** * useConsolidation Hook * Fetches real-time multi-entity consolidation P&L data * Includes smart caching (5 min TTL) to avoid excessive API calls */ import {
  useState,
  useEffect,
  useCallback,
} from "react";
import { fetchWithLucccaSession } from "../../auth";
export interface ConsolidatedEntity {
  entityId: string;
  name: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: string;
}
export interface ConsolidationSummary {
  totalRevenue: number;
  totalCogs: number;
  totalGrossProfit: number;
  grossMargin: string;
  entityCount: number;
}
export interface ConsolidationData {
  period: string;
  entityId: string;
  timestamp: string;
  summary: ConsolidationSummary;
  entities: ConsolidatedEntity[];
  cacheKey: string;
  cacheTtl: number;
}
export interface ConsolidationError {
  message: string;
  code?: string;
  status?: number;
}
interface CacheEntry {
  data: ConsolidationData;
  timestamp: number;
  ttl: number;
} // Local cache (5 minute TTL)
const consolidationCache = new Map<string, CacheEntry>();
export function useConsolidation(entityId?: string, periodDate?: string) {
  const [data, setData] = useState<ConsolidationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ConsolidationError | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const cacheKey = `consolidation:${entityId}:${periodDate}`; // Check if cache is still valid const getCachedData = useCallback(() => { const cached = consolidationCache.get(cacheKey); if (!cached) return null; const now = Date.now(); const age = (now - cached.timestamp) / 1000; // Convert to seconds if (age < cached.ttl) { setIsCached(true); return cached.data; } else { // Cache expired, remove it consolidationCache.delete(cacheKey); return null; } }, [cacheKey]); const fetchConsolidation = useCallback(async () => { if (!entityId || !periodDate) { setError({ message:"Missing entityId or periodDate", code:"INVALID_PARAMS", }); return; } // Check cache first const cachedData = getCachedData(); if (cachedData) { setData(cachedData); setIsCached(true); return; } setLoading(true); setError(null); setIsCached(false); try { const response = await fetchWithLucccaSession( `/api/aurum/consolidation/dashboard?entityId=${entityId}&periodDate=${periodDate}`, { method:"GET" }, ); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `HTTP ${response.status}`); } const consolidationData = (await response.json()) as ConsolidationData; // Cache the result consolidationCache.set(cacheKey, { data: consolidationData, timestamp: Date.now(), ttl: consolidationData.cacheTtl || 300, // Default 5 minutes }); setData(consolidationData); } catch (err) { const errorMessage = err instanceof Error ? err.message :"Unknown error"; setError({ message: errorMessage, code:"FETCH_ERROR", status: 500, }); } finally { setLoading(false); } }, [entityId, periodDate, getCachedData]); // Auto-fetch on mount or when params change useEffect(() => { fetchConsolidation(); // Auto-refresh every 5 minutes const interval = setInterval(fetchConsolidation, 5 * 60 * 1000); return () => clearInterval(interval); }, [fetchConsolidation]); const refresh = useCallback(async () => { // Clear cache for this key consolidationCache.delete(cacheKey); await fetchConsolidation(); }, [cacheKey, fetchConsolidation]); const clearCache = useCallback(() => { consolidationCache.clear(); }, []); return { data, loading, error, isCached, refresh, clearCache, };
} /** * Hook to validate consolidation entries with Guardian */
export function useConsolidationValidation() {
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationError, setValidationError] =
    useState<ConsolidationError | null>(null);
  const validateEntries = useCallback(
    async (entries: any[], parentEntityId: string) => {
      setValidating(true);
      setValidationError(null);
      try {
        const response = await fetchWithLucccaSession(
          "/api/aurum/consolidation/validate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consolidationEntries: entries,
              parentEntityId,
            }),
          },
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const result = await response.json();
        setValidationResult(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        const error: ConsolidationError = {
          message: errorMessage,
          code: "VALIDATION_ERROR",
        };
        setValidationError(error);
        throw error;
      } finally {
        setValidating(false);
      }
    },
    [],
  );
  return { validating, validationResult, validationError, validateEntries };
} /** * Hook to fetch consolidation entity hierarchy */
export function useConsolidationHierarchy(parentEntityId?: string) {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ConsolidationError | null>(null);
  const fetchHierarchy = useCallback(async () => {
    if (!parentEntityId) {
      setError({ message: "Missing parentEntityId", code: "INVALID_PARAMS" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/consolidation/entities?parentEntityId=${parentEntityId}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      setHierarchy(result.hierarchy);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError({ message: errorMessage, code: "FETCH_ERROR" });
    } finally {
      setLoading(false);
    }
  }, [parentEntityId]);
  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);
  return { hierarchy, loading, error };
}
