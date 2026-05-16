import { useCallback, useState, useMemo } from "react";

export type BulkAction<T> = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  handler: (items: T[]) => void | Promise<void>;
  dangerous?: boolean;
};

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  return {
    selectedIds,
    selectedItems,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    hasSelection: selectedIds.size > 0,
    selectCount: selectedIds.size,
  };
}
