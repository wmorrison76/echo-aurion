/**
 * LibraryPanel.tsx
 * ----------------------------------------------------------------------------
 * Left-rail panel showing the property's catalog. Each item card is
 * draggable (via @dnd-kit) into the CompositionCanvas. Search + category +
 * dietary filters narrow the visible set.
 *
 * Drag payload: { kind: 'library_item', item: PropertyItem }
 * The CompositionCanvas already handles this payload in its onDragEnd
 * handler (see CompositionCanvas.tsx — switches on
 * active.data.current.kind === 'library_item' → addItemToSection).
 * ----------------------------------------------------------------------------
 */

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useLibrary } from '../../hooks/useLibrary';
import { formatPricingModel } from '../../utils/pricing';
import type { PropertyItem, ItemCategory, DietaryTag } from '../../BanquetMenuBuilder.types';
import { ITEM_CATEGORIES, ALL_DIETARY_TAGS, DIETARY_TAGS } from '../../BanquetMenuBuilder.constants';
import './LibraryPanel.css';

// ----------------------------------------------------------------------------
// Library item card (draggable)
// ----------------------------------------------------------------------------

interface ItemCardProps {
  item: PropertyItem;
}

const LibraryItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const dragId = `library-${item.itemId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { kind: 'library_item', item },
  });

  const snap = item.current;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bmb-library-card ${isDragging ? 'is-dragging' : ''}`}
      role="button"
      aria-label={`Drag ${snap.canonicalName} to canvas`}
    >
      <div className="bmb-library-card__name">{snap.canonicalName}</div>
      <div className="bmb-library-card__meta">
        <span className="bmb-library-card__category">{snap.category}</span>
        <span className="bmb-library-card__price">{formatPricingModel(snap.pricing)}</span>
      </div>
      {snap.dietary?.tags && snap.dietary.tags.length > 0 && (
        <div className="bmb-library-card__tags">
          {snap.dietary.tags.map((t) => (
            <span key={t} className="bmb-library-card__tag" title={DIETARY_TAGS[t]?.label}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Filter UI
// ----------------------------------------------------------------------------

interface FilterBarProps {
  filters: ReturnType<typeof useLibrary>['filters'];
  setFilters: ReturnType<typeof useLibrary>['setFilters'];
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  const toggleCategory = (cat: ItemCategory) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    setFilters({ categories: next });
  };

  const toggleTag = (tag: DietaryTag) => {
    const next = filters.dietaryTags.includes(tag)
      ? filters.dietaryTags.filter((t) => t !== tag)
      : [...filters.dietaryTags, tag];
    setFilters({ dietaryTags: next });
  };

  return (
    <div className="bmb-library-filterbar">
      <input
        type="search"
        className="bmb-library-search"
        placeholder="Search items…"
        value={filters.query}
        onChange={(e) => setFilters({ query: e.target.value })}
        aria-label="Search the item library"
      />
      <details className="bmb-library-details">
        <summary>Categories ({filters.categories.length})</summary>
        <div className="bmb-library-filter-grid">
          {ITEM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`bmb-library-pill ${filters.categories.includes(cat) ? 'is-active' : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </details>
      <details className="bmb-library-details">
        <summary>Dietary ({filters.dietaryTags.length})</summary>
        <div className="bmb-library-filter-grid">
          {ALL_DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`bmb-library-pill ${filters.dietaryTags.includes(tag) ? 'is-active' : ''}`}
              onClick={() => toggleTag(tag)}
              title={DIETARY_TAGS[tag]?.label}
            >
              {tag}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Main panel
// ----------------------------------------------------------------------------

export const LibraryPanel: React.FC = () => {
  const { filtered, total, loading, error, filters, setFilters } = useLibrary();

  return (
    <aside className="bmb-library-panel" aria-label="Item library">
      <header className="bmb-library-header">
        <h3 className="bmb-library-title">Library</h3>
        <span className="bmb-library-count" aria-live="polite">
          {filtered.length} of {total}
        </span>
      </header>
      <FilterBar filters={filters} setFilters={setFilters} />
      <div className="bmb-library-list">
        {loading && <div className="bmb-library-empty">Loading…</div>}
        {error && (
          <div className="bmb-library-empty bmb-library-error">
            Failed to load library: {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="bmb-library-empty">
            {total === 0 ? 'No items in catalog.' : 'No items match the current filters.'}
          </div>
        )}
        {filtered.map((item) => (
          <LibraryItemCard key={item.itemId} item={item} />
        ))}
      </div>
    </aside>
  );
};

export default LibraryPanel;
