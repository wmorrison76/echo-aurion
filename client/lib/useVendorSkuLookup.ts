/** iter254 · useVendorSkuLookup — shared hook for live invoice→ingredient
 *  pricing autocomplete. Used by:
 *   - Culinary EchoRecipePro (CulinaryRecipeBuilder + Culinary RecipeEditor)
 *   - Pastry RecipeInputPage
 *   - MaestroBQT recipe inputs
 *
 *  Wraps GET /api/vendor-skus/lookup?q={ingredient} with debounce + caching.
 *
 *  C0.3: optional outletId narrows results to SKUs that have been received
 *  at the chef's outlet, so a pastry chef doesn't see a seafood-only
 *  outlet's salmon catalog. When omitted the hook behaves exactly as
 *  before (global pool).
 */
import { useState, useEffect, useRef } from "react";

const API = (typeof window !== "undefined" ? window.location.origin : "");

export type VendorSku = {
  id: string;
  vendor_name: string;
  item_code?: string;
  description: string;
  current_unit_price: number;
  current_uom?: string;
  pack_size?: string;
  match_score: number;
  last_invoice_number?: string;
  last_invoice_date?: string;
};

// Cache key includes outletId so an outlet switch doesn't serve stale
// cross-outlet results.
const cache = new Map<string, VendorSku[]>();

export function useVendorSkuLookup(
  query: string,
  opts?: { limit?: number; minLength?: number; debounceMs?: number; outletId?: string },
) {
  const limit = opts?.limit ?? 5;
  const minLen = opts?.minLength ?? 2;
  const debounceMs = opts?.debounceMs ?? 200;
  const outletId = opts?.outletId;
  const [matches, setMatches] = useState<VendorSku[]>([]);
  const [loading, setLoading] = useState(false);
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = (query || "").trim();
    if (q.length < minLen) {
      setMatches([]);
      setLoading(false);
      return;
    }
    const cacheKey = `${q}::${limit}::${outletId ?? "global"}`;
    if (cache.has(cacheKey)) {
      setMatches(cache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      aborter.current?.abort();
      const ac = new AbortController();
      aborter.current = ac;
      setLoading(true);
      const url = new URL(`${API}/api/vendor-skus/lookup`);
      url.searchParams.set("q", q);
      url.searchParams.set("limit", String(limit));
      if (outletId) url.searchParams.set("outlet_id", outletId);
      fetch(url.toString(), { credentials: "include", signal: ac.signal })
        .then((r) => (r.ok ? r.json() : { matches: [] }))
        .then((d) => {
          const list = (d.matches || []) as VendorSku[];
          cache.set(cacheKey, list);
          setMatches(list);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, debounceMs);
    return () => {
      clearTimeout(t);
      aborter.current?.abort();
    };
  }, [query, limit, minLen, debounceMs, outletId]);

  return { matches, loading };
}

export function clearVendorSkuCache() { cache.clear(); }
