/**
 * useLibrary.ts
 * ----------------------------------------------------------------------------
 * Fetches the property's active items via /api/banquet-menus/items, with
 * client-side filtering by category + dietary + search query. Returns a
 * memoized list ready for the LibraryPanel to render.
 *
 * Server-side filtering is available via /items/filter (POST) but for v1's
 * ~75-item demo catalog, fetching once and filtering client-side is
 * snappier and avoids round-trips on every keystroke.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react';
import { useCompositionStore } from './useCompositionStore';
import type { PropertyItem, ItemCategory, DietaryTag } from '../BanquetMenuBuilder.types';

export interface LibraryFilters {
  query: string;
  categories: ItemCategory[];
  dietaryTags: DietaryTag[];
}

export interface UseLibraryResult {
  items: PropertyItem[];
  filtered: PropertyItem[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: LibraryFilters;
  setFilters: (next: Partial<LibraryFilters>) => void;
}

const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  categories: [],
  dietaryTags: [],
};

export function useLibrary(): UseLibraryResult {
  const propertyId = useCompositionStore((s) => s.meta.propertyId);
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<LibraryFilters>(EMPTY_FILTERS);

  useEffect(() => {
    if (!propertyId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/banquet-menus/items?propertyId=${encodeURIComponent(propertyId)}&limit=500`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload: { items: PropertyItem[] }) => {
        if (cancelled) return;
        setItems(payload.items ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return items.filter((item) => {
      const snap = item.current;
      if (!snap) return false;

      if (filters.categories.length > 0 && !filters.categories.includes(snap.category)) {
        return false;
      }
      if (filters.dietaryTags.length > 0) {
        const tags = snap.dietary?.tags ?? [];
        const hasAll = filters.dietaryTags.every((t) => tags.includes(t));
        if (!hasAll) return false;
      }
      if (q) {
        const hay = [
          snap.canonicalName,
          snap.descriptions?.short,
          snap.descriptions?.long,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const setFilters = (next: Partial<LibraryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
  };

  return {
    items,
    filtered,
    total: items.length,
    loading,
    error,
    filters,
    setFilters,
  };
}
