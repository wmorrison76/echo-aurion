/**
 * useModuleEnabled (D8)
 *
 * Client hook for the modular-architecture story. Mirrors the server-side
 * `requireModuleEnabled` middleware so the UI can hide a sidebar entry,
 * disable a button, or render a "Module disabled · ask your admin" panel
 * before the user gets a 503 from the API.
 *
 *   const { enabled, loading } = useModuleEnabled("aurum");
 *   if (!enabled && !loading) return <ModuleDisabledNotice module="aurum" />;
 *
 * The result is cached in-memory across components for 60s (matching
 * the server cache) so a sidebar with 13 entries fires one fetch, not
 * thirteen.
 *
 * Fail-open mirror: if the network request errors, the hook returns
 * enabled=true. The reasoning matches server/lib/module-gate.ts —
 * accidental black-out from an outage is worse than letting the user
 * keep working.
 */

import { useEffect, useState } from "react";
import { get } from "./api-client";

export interface ModuleStatus {
  name: string;
  label: string;
  description: string;
  category: string;
  defaultEnabled: boolean;
  enabled: boolean;
  flagKey: string;
}

interface CacheEntry {
  modules: ModuleStatus[];
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 1000;
let cache: CacheEntry | null = null;
let inflight: Promise<ModuleStatus[]> | null = null;
const subscribers = new Set<() => void>();

async function fetchModules(force = false): Promise<ModuleStatus[]> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.modules;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const data = await get<{ success: boolean; modules: ModuleStatus[] }>("/api/modules");
      const modules = Array.isArray(data?.modules) ? data.modules : [];
      cache = { modules, expiresAt: Date.now() + CACHE_TTL_MS };
      subscribers.forEach((cb) => cb());
      return modules;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function invalidateModulesCache(): void {
  cache = null;
  subscribers.forEach((cb) => cb());
}

export function useModuleEnabled(moduleName: string): {
  enabled: boolean;
  loading: boolean;
  module?: ModuleStatus;
  refresh: () => void;
} {
  const [tick, setTick] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const sub = () => mounted && setTick((t) => t + 1);
    subscribers.add(sub);
    fetchModules().catch(() => {
      if (mounted) setError(true);
    });
    return () => {
      mounted = false;
      subscribers.delete(sub);
    };
  }, [moduleName]);

  // Fail-open on error — see header.
  if (error) {
    return { enabled: true, loading: false, refresh: () => fetchModules(true) };
  }

  if (!cache) {
    return { enabled: true, loading: true, refresh: () => fetchModules(true) };
  }

  const module = cache.modules.find((m) => m.name === moduleName);
  return {
    enabled: module?.enabled ?? true,
    loading: false,
    module,
    refresh: () => fetchModules(true),
  };
}

export function useAllModules(): {
  modules: ModuleStatus[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    const sub = () => {
      if (mounted) {
        setTick((t) => t + 1);
        setLoading(false);
      }
    };
    subscribers.add(sub);
    fetchModules().catch(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      subscribers.delete(sub);
    };
  }, []);

  return {
    modules: cache?.modules ?? [],
    loading,
    refresh: async () => {
      setLoading(true);
      await fetchModules(true);
    },
  };
}
