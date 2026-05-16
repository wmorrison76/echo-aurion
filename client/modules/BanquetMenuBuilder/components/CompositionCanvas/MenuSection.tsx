/**
 * MenuSection.tsx
 * ----------------------------------------------------------------------------
 * A single section in the composition canvas (e.g. "Cold Selection",
 * "Entrée"). Hosts a sortable list of MenuItemCards and a drop zone for
 * empty sections.
 *
 * The section itself is a drop target via @dnd-kit/sortable's `useDroppable`,
 * so an item dragged onto an empty section's body lands cleanly.
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  useCompositionStore,
  selectItemsForSection,
  type ComposedSection,
} from '../../hooks/useCompositionStore';
import { MenuItemCard } from './MenuItemCard';
import { SectionHeader } from './SectionHeader';
import { EmptySectionDropZone } from './EmptySectionDropZone';

interface MenuSectionProps {
  section: ComposedSection;
}

export const MenuSection: React.FC<MenuSectionProps> = ({ section }) => {
  const items = useCompositionStore((s) => selectItemsForSection(s, section.id));

  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section.id}`,
    data: { kind: 'section', sectionId: section.id },
  });

  const isEmpty = items.length === 0;

  return (
    <section
      ref={setNodeRef}
      className={[
        'bmb-section',
        isOver ? 'bmb-section--drop-active' : '',
        isEmpty ? 'bmb-section--empty' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-section-id={section.id}
      data-section-kind={section.kind}
    >
      <SectionHeader section={section} itemCount={items.length} />

      <div className="bmb-section__items">
        <SortableContext
          items={items.map((i) => i.instanceId)}
          strategy={verticalListSortingStrategy}
        >
          {isEmpty ? (
            <EmptySectionDropZone sectionName={section.name} />
          ) : (
            items.map((item) => (
              <MenuItemCard
                key={item.instanceId}
                item={item}
                sectionId={section.id}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
};
