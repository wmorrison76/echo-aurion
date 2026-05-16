/**
 * CompositionCanvas.tsx
 * ----------------------------------------------------------------------------
 * The right panel. This is the user's working surface — where items land,
 * sections live, and live calculations stream.
 *
 * Responsibilities:
 *   - Host the @dnd-kit DndContext that spans both this panel AND the
 *     center-panel item grid (Package 2). Cross-panel drag works because
 *     the DndContext is mounted at the module root (BanquetMenuBuilder/
 *     index.tsx) — see Package 4 for that wiring.
 *   - Render sections in order
 *   - Render the LiveStatsFooter
 *   - Handle drag end events and dispatch to store
 *
 * Drag-end policy:
 *   When the user drops an item, we route by drop target type:
 *     - Drop ON a section          → append to end
 *     - Drop ON another item       → insert at that item's index
 *     - Drop OUTSIDE any section   → no-op (drag is cancelled)
 *
 *   When the user drags an item FROM the center panel (a "library" item):
 *     - active.data.current.kind === 'library_item' → addItemToSection
 *     - active.data.current.kind === 'menu_item'   → moveItem
 * ----------------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  useCompositionStore,
  selectOrderedSections,
  type ComposedSection,
} from '../../hooks/useCompositionStore';
import { useDragSensors } from '../../hooks/useDragSensors';
import { MenuSection } from './MenuSection';
import { AddSectionButton } from './AddSectionButton';
import { LiveStatsFooter } from '../LiveStats/LiveStatsFooter';
import { MenuItemCard } from './MenuItemCard';
import type { PropertyItem } from '../../BanquetMenuBuilder.types';

// ----------------------------------------------------------------------------
// Drag payload types (shared with the center panel in Package 2)
// ----------------------------------------------------------------------------

export type DragPayload =
  | { kind: 'library_item'; item: PropertyItem }
  | { kind: 'menu_item'; instanceId: string };

interface CompositionCanvasProps {
  className?: string;
}

export const CompositionCanvas: React.FC<CompositionCanvasProps> = ({ className }) => {
  const sections = useCompositionStore(selectOrderedSections);
  const items = useCompositionStore((s) => s.items);
  const draggingItemId = useCompositionStore((s) => s.draggingItemId);
  const sensors = useDragSensors();

  const setDraggingItem = useCompositionStore((s) => s.setDraggingItem);
  const addItemToSection = useCompositionStore((s) => s.addItemToSection);
  const moveItem = useCompositionStore((s) => s.moveItem);

  // ----- Handlers -----

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const payload = event.active.data.current as DragPayload | undefined;
      if (payload?.kind === 'menu_item') {
        setDraggingItem(payload.instanceId);
      }
    },
    [setDraggingItem],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingItem(null);

      const { active, over } = event;
      if (!over) return;

      const activePayload = active.data.current as DragPayload | undefined;
      const overPayload = over.data.current as
        | { kind: 'section'; sectionId: string }
        | { kind: 'menu_item'; instanceId: string; sectionId: string }
        | undefined;

      if (!activePayload || !overPayload) return;

      // ----- Determine destination section + index -----
      let toSectionId: string;
      let toIndex: number;

      if (overPayload.kind === 'section') {
        toSectionId = overPayload.sectionId;
        const section = useCompositionStore.getState().sections[toSectionId];
        toIndex = section?.itemInstanceIds.length ?? 0;
      } else {
        toSectionId = overPayload.sectionId;
        const section = useCompositionStore.getState().sections[toSectionId];
        const overIdx = section?.itemInstanceIds.indexOf(overPayload.instanceId) ?? 0;
        toIndex = overIdx;
      }

      // ----- Apply ----
      if (activePayload.kind === 'library_item') {
        addItemToSection(activePayload.item, toSectionId, toIndex);
      } else if (activePayload.kind === 'menu_item') {
        // Don't drop onto self
        if (
          overPayload.kind === 'menu_item' &&
          overPayload.instanceId === activePayload.instanceId
        ) {
          return;
        }
        moveItem(activePayload.instanceId, toSectionId, toIndex);
      }
    },
    [addItemToSection, moveItem, setDraggingItem],
  );

  const handleDragCancel = useCallback(() => {
    setDraggingItem(null);
  }, [setDraggingItem]);

  // ----- Active drag preview -----

  const activeDragItem = draggingItemId ? items[draggingItemId] : null;

  // ----- Render -----

  return (
    <div className={`bmb-canvas ${className ?? ''}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="bmb-canvas__scroll">
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.length === 0 ? (
              <CanvasEmptyState />
            ) : (
              sections.map((section) => (
                <MenuSection key={section.id} section={section} />
              ))
            )}
          </SortableContext>
          <AddSectionButton />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <div className="bmb-drag-overlay">
              <MenuItemCard
                item={activeDragItem}
                sectionId={''}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LiveStatsFooter />
    </div>
  );
};

// ----------------------------------------------------------------------------
// Empty state
// ----------------------------------------------------------------------------

const CanvasEmptyState: React.FC = () => (
  <div className="bmb-canvas__empty">
    <div className="bmb-canvas__empty-orb" aria-hidden="true" />
    <h3 className="bmb-canvas__empty-title">Your menu starts here</h3>
    <p className="bmb-canvas__empty-body">
      Drag items from the library, or ask Echo to compose a starting point.
    </p>
  </div>
);
