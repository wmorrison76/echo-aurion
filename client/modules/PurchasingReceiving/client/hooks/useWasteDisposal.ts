/**
 * useWasteDisposal - React hooks for disposal tracking
 * Handles waste disposal, compliance, and environmental impact.
 */

import { useCallback, useEffect, useState } from "react";

import type {
  DisposalMethod,
  WasteDisposal,
  WasteEnvironmentalImpact,
} from "@shared/types/waste";
import * as disposalAPI from "@shared/api/waste-disposal";

interface UseDisposalMethodsOptions {
  organizationId?: string;
}

export function useDisposalMethods(options: UseDisposalMethodsOptions) {
  const [methods, setMethods] = useState<DisposalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await disposalAPI.getDisposalMethods(
          options.organizationId,
        );
        if (cancelled) return;
        setMethods(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch disposal methods"),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options.organizationId]);

  const methodsByCategory = methods.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {} as Record<string, DisposalMethod[]>,
  );

  return { methods, loading, error, methodsByCategory };
}

interface UseWasteDisposalsOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWasteDisposals(options: UseWasteDisposalsOptions) {
  const [disposals, setDisposals] = useState<WasteDisposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDisposals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await disposalAPI.getWasteDisposals(options.organizationId, {
        outletId: options.outletId,
        limit: 100,
      });
      setDisposals(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch waste disposals"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);

  useEffect(() => {
    void fetchDisposals();
    if (!options.autoRefresh) return;
    const interval = window.setInterval(
      fetchDisposals,
      (options.refreshInterval || 300) * 1000,
    );
    return () => window.clearInterval(interval);
  }, [fetchDisposals, options.autoRefresh, options.refreshInterval]);

  const createDisposal = useCallback(
    async (
      disposal: Omit<WasteDisposal, "id" | "created_at" | "updated_at">,
    ) => {
      const newDisposal = await disposalAPI.createWasteDisposal(disposal);
      setDisposals((prev) => [...prev, newDisposal]);
      return newDisposal;
    },
    [],
  );

  const totalDisposalCost = disposals.reduce(
    (sum, d) => sum + (d.cost || 0),
    0,
  );
  const totalDisposalRevenue = disposals.reduce(
    (sum, d) => sum + (d.revenue || 0),
    0,
  );

  return {
    disposals,
    loading,
    error,
    refetch: fetchDisposals,
    createDisposal,
    summary: {
      total: disposals.length,
      totalCost: totalDisposalCost,
      totalRevenue: totalDisposalRevenue,
      netCost: totalDisposalCost - totalDisposalRevenue,
    },
  };
}

interface UseDisposalMethodUsageOptions {
  organizationId: string;
  outletId?: string;
}

export function useDisposalMethodUsage(options: UseDisposalMethodUsageOptions) {
  const [usage, setUsage] = useState<
    {
      method_id: string;
      method_name: string;
      category: string;
      usage_count: number;
      total_cost: number;
      total_volume_kg: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await disposalAPI.getDisposalMethodUsage(
          options.organizationId,
          { outletId: options.outletId },
        );
        if (cancelled) return;
        setUsage(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch disposal method usage"),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options.organizationId, options.outletId]);

  return {
    usage,
    loading,
    error,
    mostUsedMethod: usage.length > 0 ? usage[0] : null,
  };
}

interface UseEnvironmentalImpactOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useEnvironmentalImpact(options: UseEnvironmentalImpactOptions) {
  const [impact, setImpact] = useState<WasteEnvironmentalImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchImpact = useCallback(async () => {
    try {
      setLoading(true);
      const data = await disposalAPI.getEnvironmentalImpactSummary(
        options.organizationId,
        options.outletId,
      );
      setImpact(data as any);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch environmental impact"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);

  useEffect(() => {
    void fetchImpact();
    if (!options.autoRefresh) return;
    const interval = window.setInterval(
      fetchImpact,
      (options.refreshInterval || 3600) * 1000,
    );
    return () => window.clearInterval(interval);
  }, [fetchImpact, options.autoRefresh, options.refreshInterval]);

  return { impact, loading, error, refetch: fetchImpact };
}
