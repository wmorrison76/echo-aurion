/**
 * Virtual Scrolling Components
 *
 * Efficient list rendering for large datasets.
 * Only renders visible items, significantly improving performance.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  containerHeight?: number;
  overscan?: number; // Number of items to render outside visible area
}

/**
 * VirtualScrollList Component
 * Efficient list rendering using virtual scrolling
 *
 * @example
 * <VirtualScrollList
 *   items={1000items}
 *   itemHeight={60}
 *   containerHeight={600}
 *   renderItem={(item) => <ItemCard item={item} />}
 * />
 */
export const VirtualScrollList = React.forwardRef<
  HTMLDivElement,
  VirtualScrollListProps<any>
>(
  (
    {
      items,
      itemHeight,
      renderItem,
      className = "",
      containerHeight = 600,
      overscan = 5,
    },
    ref,
  ) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const virtualListHeight = items.length * itemHeight;

    // Calculate which items are visible
    const visibleRange = useMemo(() => {
      const startIndex = Math.max(
        0,
        Math.floor(scrollTop / itemHeight) - overscan,
      );
      const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
      );

      return { startIndex, endIndex };
    }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

    const visibleItems = useMemo(() => {
      return items
        .slice(visibleRange.startIndex, visibleRange.endIndex)
        .map((item, idx) => ({
          item,
          index: visibleRange.startIndex + idx,
        }));
    }, [items, visibleRange]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollTop(target.scrollTop);
    }, []);

    const offsetY = visibleRange.startIndex * itemHeight;

    return (
      <div
        ref={ref || containerRef}
        className={`overflow-y-auto relative ${className}`}
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Virtual scroll container */}
        <div style={{ height: virtualListHeight, position: "relative" }}>
          {/* Visible items wrapper */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map(({ item, index }) => (
              <div
                key={index}
                style={{ height: itemHeight, overflow: "hidden" }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);

VirtualScrollList.displayName = "VirtualScrollList";

/**
 * useVirtualScroll Hook
 * For custom implementations of virtual scrolling
 */
export function useVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan = 5,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan,
    );
    const endIndex = Math.min(
      itemCount,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const handleScroll = useCallback((scrollTopValue: number) => {
    setScrollTop(scrollTopValue);
  }, []);

  return {
    visibleRange,
    handleScroll,
    scrollTop,
    totalHeight: itemCount * itemHeight,
    offsetY: visibleRange.startIndex * itemHeight,
  };
}

/**
 * VirtualTable Component
 * Virtual scrolling for table-like layouts
 */
interface VirtualTableProps<T> {
  items: T[];
  rowHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  className?: string;
}

export const VirtualTable = React.forwardRef<
  HTMLDivElement,
  VirtualTableProps<any>
>(
  (
    { items, rowHeight, renderRow, containerHeight = 600, className = "" },
    ref,
  ) => {
    return (
      <VirtualScrollList
        ref={ref}
        items={items}
        itemHeight={rowHeight}
        renderItem={renderRow}
        containerHeight={containerHeight}
        className={className}
      />
    );
  },
);

VirtualTable.displayName = "VirtualTable";
