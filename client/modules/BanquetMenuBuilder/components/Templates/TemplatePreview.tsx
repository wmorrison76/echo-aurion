/**
 * components/Templates/TemplatePreview.tsx
 * ----------------------------------------------------------------------------
 * Detail view shown when the chef selects a template card. Shows the
 * sections, suggested items (or slot kinds for system templates), budget
 * band, and offers two apply actions:
 *
 *   - Replace current menu — drops everything, applies template
 *   - Merge into current — keeps existing items, adds template's items
 *     where slots resolve and current sections don't already have them
 * ----------------------------------------------------------------------------
 */

import React, { useEffect, useRef } from 'react';
import type { MenuTemplate } from '../../BanquetMenuBuilder.p5.types';

interface TemplatePreviewProps {
  template: MenuTemplate;
  onApply: (mode: 'replace' | 'merge') => Promise<void> | void;
  onClose: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  onApply,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  // Initial focus
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const closeBtn = dialogRef.current?.querySelector<HTMLButtonElement>(
        '[data-autofocus="true"]',
      );
      closeBtn?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const itemCount = template.sections.reduce(
    (n, s) => n + s.suggestedItemIds.length,
    0,
  );

  return (
    <div
      className="bmb-template-preview__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="bmb-template-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
      >
        <header className="bmb-template-preview__header">
          <div>
            <span className="bmb-template-preview__category">
              {template.category}
            </span>
            <h2
              id="template-preview-title"
              className="bmb-template-preview__title"
            >
              {template.name}
            </h2>
            {template.subtitle && (
              <p className="bmb-template-preview__subtitle">{template.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="bmb-template-preview__close"
            onClick={onClose}
            data-autofocus="true"
            aria-label="Close template preview"
          >
            ×
          </button>
        </header>

        <div className="bmb-template-preview__meta">
          <div className="bmb-template-preview__meta-item">
            <span className="bmb-template-preview__meta-label">Budget</span>
            <span className="bmb-template-preview__meta-value">
              ${template.budgetBand.low}–${template.budgetBand.high}/guest
            </span>
          </div>
          <div className="bmb-template-preview__meta-item">
            <span className="bmb-template-preview__meta-label">Guests</span>
            <span className="bmb-template-preview__meta-value">
              {template.guestCountBand.min}–{template.guestCountBand.max}
            </span>
          </div>
          <div className="bmb-template-preview__meta-item">
            <span className="bmb-template-preview__meta-label">Items</span>
            <span className="bmb-template-preview__meta-value">
              {itemCount} across {template.sections.length} sections
            </span>
          </div>
        </div>

        {template.styleTags.length > 0 && (
          <div className="bmb-template-preview__tags">
            {template.styleTags.map((t) => (
              <span key={t} className="bmb-template-preview__tag">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="bmb-template-preview__sections">
          {template.sections.map((section) => (
            <section
              key={section.id}
              className="bmb-template-preview__section"
            >
              <h3 className="bmb-template-preview__section-title">
                {section.label}
                <span className="bmb-template-preview__section-count">
                  {section.suggestedItemIds.length} items
                </span>
              </h3>
              {section.notes && (
                <p className="bmb-template-preview__section-notes">
                  {section.notes}
                </p>
              )}
              <ul className="bmb-template-preview__slot-list">
                {section.suggestedItemIds.map((slot, idx) => (
                  <li key={`${slot}-${idx}`} className="bmb-template-preview__slot">
                    <SlotIcon slot={slot} />
                    <span className="bmb-template-preview__slot-label">
                      {formatSlotLabel(slot)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {template.dietaryTargets && (
          <div className="bmb-template-preview__dietary">
            <span className="bmb-template-preview__dietary-label">
              Dietary coverage targets
            </span>
            <div className="bmb-template-preview__dietary-grid">
              {Object.entries(template.dietaryTargets).map(([key, val]) => (
                <div key={key} className="bmb-template-preview__dietary-item">
                  <span className="bmb-template-preview__dietary-key">
                    {formatDietaryKey(key)}
                  </span>
                  <span className="bmb-template-preview__dietary-val">
                    {Math.round((val ?? 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="bmb-template-preview__actions">
          <button
            type="button"
            className="bmb-template-preview__apply bmb-template-preview__apply--primary"
            onClick={() => void onApply('replace')}
          >
            Replace current menu
          </button>
          <button
            type="button"
            className="bmb-template-preview__apply bmb-template-preview__apply--secondary"
            onClick={() => void onApply('merge')}
          >
            Merge into current
          </button>
          <button
            type="button"
            className="bmb-template-preview__apply bmb-template-preview__apply--ghost"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Slot rendering helpers
// ----------------------------------------------------------------------------

function formatSlotLabel(slot: string): string {
  if (!slot.startsWith('slot:')) {
    return slot; // already a real id, repository will resolve
  }
  return slot
    .slice('slot:'.length)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDietaryKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const SlotIcon: React.FC<{ slot: string }> = ({ slot }) => {
  // Visual cue for slot type
  const isReal = !slot.startsWith('slot:');
  return (
    <span
      className={[
        'bmb-template-preview__slot-icon',
        isReal
          ? 'bmb-template-preview__slot-icon--real'
          : 'bmb-template-preview__slot-icon--placeholder',
      ].join(' ')}
      aria-hidden="true"
    >
      {isReal ? '●' : '○'}
    </span>
  );
};
