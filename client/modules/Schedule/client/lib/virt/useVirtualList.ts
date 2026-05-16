import { useMemo } from "react"; /** * Very light"virtual list" calculator for large schedule renders. * Returns slice indices for a visible window given rowHeight & containerHeight. */
export function useVirtualList({
  rowCount,
  rowHeight,
  containerHeight,
  scrollTop,
  overscan = 5,
}: {
  rowCount: number;
  rowHeight: number;
  containerHeight: number;
  scrollTop: number;
  overscan?: number;
}) {
  return useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
    const end = Math.min(rowCount, start + visibleCount);
    const offset = start * rowHeight;
    const height = rowCount * rowHeight;
    return { start, end, offset, height };
  }, [rowCount, rowHeight, containerHeight, scrollTop, overscan]);
}
