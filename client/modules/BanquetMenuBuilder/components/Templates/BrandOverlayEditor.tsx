/**
 * components/Templates/BrandOverlayEditor.tsx
 * ----------------------------------------------------------------------------
 * Editor for the property's brand overlay — colors, fonts, header/footer
 * lines, logo. The overlay applies on publish. Properties typically have
 * one default overlay but can override per-event (a wedding might use
 * the couple's monogram instead of the property logo).
 *
 * Renders inline (in the workflow drawer) — not a modal.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useCallback } from 'react';
import type { BrandOverlay } from '../../BanquetMenuBuilder.p5.types';

interface BrandOverlayEditorProps {
  initial?: BrandOverlay;
  onSave: (overlay: BrandOverlay) => void | Promise<void>;
  onCancel?: () => void;
}

const DEFAULT_OVERLAY: BrandOverlay = {
  id: 'default',
  name: 'Default brand',
  primaryColor: '#c9a961',
  accentColor: '#0d0e10',
  displayFont: 'Playfair Display, serif',
  bodyFont: 'Inter, system-ui, sans-serif',
  headerLine: '',
  footerLine: '',
};

export const BrandOverlayEditor: React.FC<BrandOverlayEditorProps> = ({
  initial,
  onSave,
  onCancel,
}) => {
  const [overlay, setOverlay] = useState<BrandOverlay>(initial ?? DEFAULT_OVERLAY);
  const [isSaving, setIsSaving] = useState(false);

  const update = useCallback(<K extends keyof BrandOverlay>(key: K, value: BrandOverlay[K]) => {
    setOverlay((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await onSave(overlay);
      } finally {
        setIsSaving(false);
      }
    },
    [overlay, onSave],
  );

  return (
    <form className="bmb-brand-editor" onSubmit={handleSave}>
      <div className="bmb-brand-editor__row">
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Brand name</span>
          <input
            type="text"
            className="bmb-brand-editor__input"
            value={overlay.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </label>
      </div>

      <div className="bmb-brand-editor__row bmb-brand-editor__row--two">
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Primary color</span>
          <div className="bmb-brand-editor__color-row">
            <input
              type="color"
              className="bmb-brand-editor__color-swatch"
              value={overlay.primaryColor}
              onChange={(e) => update('primaryColor', e.target.value)}
              aria-label="Primary color picker"
            />
            <input
              type="text"
              className="bmb-brand-editor__input bmb-brand-editor__input--hex"
              value={overlay.primaryColor}
              onChange={(e) => update('primaryColor', e.target.value)}
            />
          </div>
        </label>
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Accent color</span>
          <div className="bmb-brand-editor__color-row">
            <input
              type="color"
              className="bmb-brand-editor__color-swatch"
              value={overlay.accentColor}
              onChange={(e) => update('accentColor', e.target.value)}
              aria-label="Accent color picker"
            />
            <input
              type="text"
              className="bmb-brand-editor__input bmb-brand-editor__input--hex"
              value={overlay.accentColor}
              onChange={(e) => update('accentColor', e.target.value)}
            />
          </div>
        </label>
      </div>

      <div className="bmb-brand-editor__row bmb-brand-editor__row--two">
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Display font</span>
          <input
            type="text"
            className="bmb-brand-editor__input"
            value={overlay.displayFont ?? ''}
            onChange={(e) => update('displayFont', e.target.value)}
            placeholder="Playfair Display, serif"
          />
        </label>
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Body font</span>
          <input
            type="text"
            className="bmb-brand-editor__input"
            value={overlay.bodyFont ?? ''}
            onChange={(e) => update('bodyFont', e.target.value)}
            placeholder="Inter, system-ui, sans-serif"
          />
        </label>
      </div>

      <div className="bmb-brand-editor__row">
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Logo URL (optional)</span>
          <input
            type="url"
            className="bmb-brand-editor__input"
            value={overlay.logoUrl ?? ''}
            onChange={(e) => update('logoUrl', e.target.value)}
            placeholder="https://…"
          />
        </label>
      </div>

      <div className="bmb-brand-editor__row">
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Header line</span>
          <input
            type="text"
            className="bmb-brand-editor__input"
            value={overlay.headerLine ?? ''}
            onChange={(e) => update('headerLine', e.target.value)}
            placeholder="The Carlyle Hotel — Wedding Reception"
          />
        </label>
      </div>

      <div className="bmb-brand-editor__row">
        <label className="bmb-brand-editor__field">
          <span className="bmb-brand-editor__label">Footer line</span>
          <input
            type="text"
            className="bmb-brand-editor__input"
            value={overlay.footerLine ?? ''}
            onChange={(e) => update('footerLine', e.target.value)}
            placeholder="Presented by …"
          />
        </label>
      </div>

      {/* Live preview */}
      <div className="bmb-brand-editor__preview">
        <span className="bmb-brand-editor__preview-label">Preview</span>
        <div
          className="bmb-brand-editor__preview-card"
          style={{
            borderTopColor: overlay.primaryColor,
            color: overlay.accentColor,
            fontFamily: overlay.bodyFont ?? 'inherit',
          }}
        >
          {overlay.logoUrl && (
            <img
              src={overlay.logoUrl}
              alt=""
              className="bmb-brand-editor__preview-logo"
            />
          )}
          <h4
            className="bmb-brand-editor__preview-header"
            style={{ fontFamily: overlay.displayFont ?? 'inherit' }}
          >
            {overlay.headerLine || 'Sample Menu'}
          </h4>
          <p
            className="bmb-brand-editor__preview-course"
            style={{ color: overlay.primaryColor }}
          >
            FIRST COURSE
          </p>
          <p>Heirloom tomato salad</p>
          <p
            className="bmb-brand-editor__preview-course"
            style={{ color: overlay.primaryColor }}
          >
            ENTREE
          </p>
          <p>Pan-roasted halibut</p>
          {overlay.footerLine && (
            <p className="bmb-brand-editor__preview-footer">{overlay.footerLine}</p>
          )}
        </div>
      </div>

      <div className="bmb-brand-editor__actions">
        <button
          type="submit"
          className="bmb-brand-editor__save"
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save brand'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="bmb-brand-editor__cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
