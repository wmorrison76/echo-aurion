/**
 * SectionHeader.tsx
 * ----------------------------------------------------------------------------
 * The header row above each section's items. Shows section name, item
 * count, and inline-edit affordance for renaming. A small overflow menu
 * exposes "remove section" — guarded with confirmation when the section
 * is non-empty (we don't want a chef nuking 8 items by misclick).
 * ----------------------------------------------------------------------------
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  useCompositionStore,
  type ComposedSection,
} from '../../hooks/useCompositionStore';
import { formatCount } from '../../utils/compositionMath';

interface SectionHeaderProps {
  section: ComposedSection;
  itemCount: number;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ section, itemCount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(section.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const renameSection = useCompositionStore((s) => s.renameSection);
  const removeSection = useCompositionStore((s) => s.removeSection);

  // Keep draft in sync with prop changes (e.g. external rename)
  useEffect(() => {
    if (!isEditing) setDraftName(section.name);
  }, [section.name, isEditing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== section.name) {
      renameSection(section.id, trimmed);
    } else {
      setDraftName(section.name);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraftName(section.name);
    setIsEditing(false);
  };

  const handleRemove = () => {
    setMenuOpen(false);
    if (itemCount > 0) {
      const confirmed = window.confirm(
        `Remove "${section.name}" and its ${itemCount} ${
          itemCount === 1 ? 'item' : 'items'
        }?`,
      );
      if (!confirmed) return;
    }
    removeSection(section.id);
  };

  return (
    <header className="bmb-section-header">
      <div className="bmb-section-header__main">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="bmb-section-header__input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              else if (e.key === 'Escape') cancelEdit();
            }}
            aria-label={`Rename section ${section.name}`}
          />
        ) : (
          <button
            type="button"
            className="bmb-section-header__title"
            onClick={() => setIsEditing(true)}
            title="Click to rename"
          >
            {section.name}
          </button>
        )}
        <span className="bmb-section-header__count">
          {formatCount(itemCount, 'item')}
        </span>
      </div>

      <div className="bmb-section-header__actions" ref={menuRef}>
        <button
          type="button"
          className="bmb-section-header__menu-trigger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Section options"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="bmb-section-header__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="bmb-section-header__menu-item"
              onClick={() => {
                setMenuOpen(false);
                setIsEditing(true);
              }}
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="bmb-section-header__menu-item bmb-section-header__menu-item--danger"
              onClick={handleRemove}
            >
              Remove section
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
