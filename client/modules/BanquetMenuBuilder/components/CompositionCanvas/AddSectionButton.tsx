/**
 * AddSectionButton.tsx
 * ----------------------------------------------------------------------------
 * Button at the bottom of the canvas to add a new section. Opens a small
 * picker for the section kind. The kind is more than cosmetic — it drives
 * default Echo behavior, item suggestions, and operational analysis
 * grouping.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useRef, useEffect } from 'react';
import { useCompositionStore } from '../../hooks/useCompositionStore';
import type { MenuSection as MenuSectionType } from '../../BanquetMenuBuilder.types';

const KIND_OPTIONS: Array<{ kind: MenuSectionType; label: string }> = [
  { kind: 'canape', label: 'Canapés' },
  { kind: 'cold', label: 'Cold Selection' },
  { kind: 'hot', label: 'Hot Selection' },
  { kind: 'soup', label: 'Soup' },
  { kind: 'salad', label: 'Salad' },
  { kind: 'appetizer', label: 'Appetizer' },
  { kind: 'entree', label: 'Entrée' },
  { kind: 'side', label: 'Side' },
  { kind: 'carving', label: 'Carving Station' },
  { kind: 'station', label: 'Action Station' },
  { kind: 'dessert', label: 'Dessert' },
  { kind: 'bakery', label: 'Bakery' },
  { kind: 'beverage', label: 'Beverage' },
  { kind: 'other', label: 'Other' },
];

export const AddSectionButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const addSection = useCompositionStore((s) => s.addSection);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handlePick = (kind: MenuSectionType, label: string) => {
    addSection(kind, label);
    setOpen(false);
  };

  return (
    <div className="bmb-add-section" ref={popoverRef}>
      <button
        type="button"
        className="bmb-add-section__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="bmb-add-section__plus" aria-hidden="true">
          +
        </span>
        Add section
      </button>

      {open && (
        <div className="bmb-add-section__popover" role="menu">
          {KIND_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              className="bmb-add-section__option"
              onClick={() => handlePick(kind, label)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
