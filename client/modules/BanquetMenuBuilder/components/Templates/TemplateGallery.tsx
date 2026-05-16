/**
 * components/Templates/TemplateGallery.tsx
 * ----------------------------------------------------------------------------
 * Grid of template cards — system, property, and (optionally) network.
 * Filter chips along the top let the chef narrow by category, style, or
 * budget band.
 *
 * Card click opens TemplatePreview in a dialog. Apply from the preview.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useMemo } from 'react';
import { useTemplateBinding } from '../../hooks/useTemplateBinding';
import { TemplatePreview } from './TemplatePreview';
import type {
  MenuTemplate,
  TemplateCategory,
} from '../../BanquetMenuBuilder.p5.types';

interface TemplateGalleryProps {
  /** Optional eventType to pre-filter */
  eventType?: string;
  /** Whether to include network templates in the listing */
  includeNetwork?: boolean;
  /** Called when the chef applies a template — receives the GeneratedMenu */
  onApplyTemplate: (template: MenuTemplate, mode: 'replace' | 'merge') => Promise<void> | void;
  /** Called to close the gallery */
  onClose?: () => void;
}

const CATEGORY_FILTERS: Array<{ key: TemplateCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'gala', label: 'Gala' },
  { key: 'cocktail', label: 'Cocktail' },
  { key: 'plated', label: 'Plated' },
  { key: 'station', label: 'Station' },
  { key: 'lunch', label: 'Lunch' },
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  eventType,
  includeNetwork = true,
  onApplyTemplate,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<MenuTemplate | null>(null);

  const { templates, isLoading, error } = useTemplateBinding({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    eventType,
    includeNetwork,
  });

  const grouped = useMemo(() => groupBySource(templates), [templates]);

  return (
    <div className="bmb-template-gallery">
      <header className="bmb-template-gallery__header">
        <div>
          <span className="bmb-template-gallery__eyebrow">Templates</span>
          <h2 className="bmb-template-gallery__title">Start from a template</h2>
          <p className="bmb-template-gallery__subtitle">
            Pre-built menu structures for common events. Apply, then customize.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="bmb-template-gallery__close"
            onClick={onClose}
            aria-label="Close template gallery"
          >
            ×
          </button>
        )}
      </header>

      {/* Category filter chips */}
      <div className="bmb-template-gallery__filters" role="tablist">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            className={[
              'bmb-template-gallery__filter',
              selectedCategory === f.key
                ? 'bmb-template-gallery__filter--active'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSelectedCategory(f.key as TemplateCategory | 'all')}
            aria-selected={selectedCategory === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="bmb-template-gallery__loading">Loading templates…</div>
      )}

      {error && (
        <div className="bmb-template-gallery__error" role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && templates.length === 0 && (
        <div className="bmb-template-gallery__empty">
          No templates match your filters. Try a different category.
        </div>
      )}

      {!isLoading && !error && templates.length > 0 && (
        <div className="bmb-template-gallery__sections">
          {grouped.property.length > 0 && (
            <TemplateSection
              title="Your templates"
              templates={grouped.property}
              onSelect={setPreviewTemplate}
            />
          )}
          {grouped.system.length > 0 && (
            <TemplateSection
              title="System templates"
              templates={grouped.system}
              onSelect={setPreviewTemplate}
            />
          )}
          {grouped.network.length > 0 && (
            <TemplateSection
              title="From the network"
              subtitle="Top-performing templates from peer properties (anonymized)"
              templates={grouped.network}
              onSelect={setPreviewTemplate}
            />
          )}
        </div>
      )}

      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onApply={async (mode) => {
            await onApplyTemplate(previewTemplate, mode);
            setPreviewTemplate(null);
            onClose?.();
          }}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Section
// ----------------------------------------------------------------------------

interface TemplateSectionProps {
  title: string;
  subtitle?: string;
  templates: MenuTemplate[];
  onSelect: (t: MenuTemplate) => void;
}

const TemplateSection: React.FC<TemplateSectionProps> = ({
  title,
  subtitle,
  templates,
  onSelect,
}) => (
  <section className="bmb-template-gallery__section">
    <h3 className="bmb-template-gallery__section-title">
      {title}
      <span className="bmb-template-gallery__section-count">
        {templates.length}
      </span>
    </h3>
    {subtitle && (
      <p className="bmb-template-gallery__section-subtitle">{subtitle}</p>
    )}
    <ul className="bmb-template-gallery__grid">
      {templates.map((t) => (
        <li key={t.id}>
          <TemplateCard template={t} onSelect={() => onSelect(t)} />
        </li>
      ))}
    </ul>
  </section>
);

// ----------------------------------------------------------------------------
// Card
// ----------------------------------------------------------------------------

interface TemplateCardProps {
  template: MenuTemplate;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const sectionCount = template.sections.length;
  const itemCount = template.sections.reduce(
    (n, s) => n + s.suggestedItemIds.length,
    0,
  );
  return (
    <button
      type="button"
      className={`bmb-template-card bmb-template-card--${template.source}`}
      onClick={onSelect}
    >
      <div className="bmb-template-card__header">
        <span className="bmb-template-card__category">{template.category}</span>
        {template.source === 'network' && (
          <span className="bmb-template-card__badge bmb-template-card__badge--network">
            Network
          </span>
        )}
        {template.source === 'system' && (
          <span className="bmb-template-card__badge bmb-template-card__badge--system">
            System
          </span>
        )}
      </div>
      <h4 className="bmb-template-card__name">{template.name}</h4>
      {template.subtitle && (
        <p className="bmb-template-card__subtitle">{template.subtitle}</p>
      )}
      <div className="bmb-template-card__meta">
        <span>
          ${template.budgetBand.low}–${template.budgetBand.high}/g
        </span>
        <span>•</span>
        <span>{sectionCount} sections</span>
        <span>•</span>
        <span>{itemCount} items</span>
      </div>
      {template.styleTags.length > 0 && (
        <div className="bmb-template-card__tags">
          {template.styleTags.slice(0, 3).map((tag) => (
            <span key={tag} className="bmb-template-card__tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

interface GroupedTemplates {
  property: MenuTemplate[];
  system: MenuTemplate[];
  network: MenuTemplate[];
}

function groupBySource(templates: MenuTemplate[]): GroupedTemplates {
  return {
    property: templates.filter((t) => t.source === 'property'),
    system: templates.filter((t) => t.source === 'system'),
    network: templates.filter((t) => t.source === 'network'),
  };
}
