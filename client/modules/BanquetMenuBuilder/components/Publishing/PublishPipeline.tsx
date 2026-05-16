/**
 * components/Publishing/PublishPipeline.tsx
 * ----------------------------------------------------------------------------
 * Multi-surface publishing UI. Lets the chef pick which surfaces to
 * publish to, optionally override the brand overlay, and dispatch the
 * publish action. Shows per-surface progress + result links/downloads.
 *
 * Triggered after the workflow reaches 'approved' stage. Either:
 *   - As part of the approved → published transition flow
 *   - Manually via the Publish button on the panel
 *
 * State machine:
 *   idle → publishing → success | partial | error
 *
 * On success, each artifact gets a card: download link for files, preview
 * iframe for inline content, copy button for sharing URLs.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useCallback } from 'react';
import { SurfaceCard } from './SurfaceCard';
import type {
  PublishSurface,
  PublishedArtifact,
  BrandOverlay,
  PublishResult,
} from '../../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../../hooks/useMenuComposition';
import { publish, SURFACE_META } from '../../services/publishingService';

interface PublishPipelineProps {
  composition: CompositionSnapshot;
  brandOverlay?: BrandOverlay;
  publishedBy: string;
  /** Pre-selected surfaces (optional) — defaults to print + web */
  defaultSurfaces?: PublishSurface[];
  /** Called when publish completes successfully (chains to workflow update) */
  onPublishComplete?: (result: PublishResult) => void;
  /** Called to close/cancel the pipeline view */
  onClose?: () => void;
}

const ALL_SURFACES: PublishSurface[] = [
  'print',
  'web',
  'beo',
  'guest_pdf',
  'kitchen_card',
];

const DEFAULT_SELECTED: PublishSurface[] = ['print', 'web'];

export const PublishPipeline: React.FC<PublishPipelineProps> = ({
  composition,
  brandOverlay,
  publishedBy,
  defaultSurfaces = DEFAULT_SELECTED,
  onPublishComplete,
  onClose,
}) => {
  const [selected, setSelected] = useState<Set<PublishSurface>>(
    () => new Set(defaultSurfaces),
  );
  const [phase, setPhase] = useState<'idle' | 'publishing' | 'done' | 'error'>(
    'idle',
  );
  const [artifacts, setArtifacts] = useState<PublishedArtifact[]>([]);
  const [errors, setErrors] = useState<PublishResult['errors']>(undefined);
  const [topLevelError, setTopLevelError] = useState<string | null>(null);

  const toggleSurface = useCallback((surface: PublishSurface) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(surface)) next.delete(surface);
      else next.add(surface);
      return next;
    });
  }, []);

  const handlePublish = useCallback(async () => {
    if (selected.size === 0) {
      setTopLevelError('Select at least one surface to publish to.');
      return;
    }
    setPhase('publishing');
    setTopLevelError(null);
    setArtifacts([]);
    setErrors(undefined);

    try {
      const result = await publish({
        composition,
        request: {
          surfaces: [...selected],
          brandOverlay,
        },
        publishedBy,
      });
      setArtifacts(result.artifacts);
      setErrors(result.errors);
      setPhase(result.errors && result.errors.length === selected.size ? 'error' : 'done');
      onPublishComplete?.(result);
    } catch (err) {
      setTopLevelError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [selected, composition, brandOverlay, publishedBy, onPublishComplete]);

  return (
    <div className="bmb-publish">
      <header className="bmb-publish__header">
        <div>
          <span className="bmb-publish__eyebrow">Publish</span>
          <h2 className="bmb-publish__title">Send to all the right places</h2>
          <p className="bmb-publish__subtitle">
            Pick the formats you need. Each surface generates independently.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="bmb-publish__close"
            onClick={onClose}
            aria-label="Close publish pipeline"
          >
            ×
          </button>
        )}
      </header>

      {/* Surface grid */}
      {phase !== 'done' && (
        <div className="bmb-publish__surfaces">
          {ALL_SURFACES.map((surface) => {
            const meta = SURFACE_META[surface];
            const isSelected = selected.has(surface);
            return (
              <button
                key={surface}
                type="button"
                className={[
                  'bmb-publish__surface',
                  isSelected ? 'bmb-publish__surface--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggleSurface(surface)}
                disabled={phase === 'publishing'}
                aria-pressed={isSelected}
              >
                <span className="bmb-publish__surface-icon" aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="bmb-publish__surface-label">{meta.label}</span>
                <span className="bmb-publish__surface-description">
                  {meta.description}
                </span>
                <span
                  className={[
                    'bmb-publish__surface-check',
                    isSelected ? 'bmb-publish__surface-check--on' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Brand overlay summary */}
      {phase !== 'done' && brandOverlay && (
        <div className="bmb-publish__brand-summary">
          <span className="bmb-publish__brand-eyebrow">Using brand</span>
          <div className="bmb-publish__brand-chip">
            <span
              className="bmb-publish__brand-swatch"
              style={{ background: brandOverlay.primaryColor }}
              aria-hidden="true"
            />
            {brandOverlay.name}
          </div>
        </div>
      )}

      {/* Errors */}
      {topLevelError && (
        <div className="bmb-publish__error" role="alert">
          {topLevelError}
        </div>
      )}

      {/* Action */}
      {phase !== 'done' && (
        <div className="bmb-publish__actions">
          <button
            type="button"
            className="bmb-publish__publish-button"
            onClick={handlePublish}
            disabled={phase === 'publishing' || selected.size === 0}
          >
            {phase === 'publishing'
              ? 'Publishing…'
              : `Publish to ${selected.size} ${selected.size === 1 ? 'surface' : 'surfaces'}`}
          </button>
          {onClose && phase !== 'publishing' && (
            <button
              type="button"
              className="bmb-publish__cancel"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {phase === 'done' && (
        <div className="bmb-publish__results">
          <div className="bmb-publish__results-header">
            <span className="bmb-publish__results-icon" aria-hidden="true">
              ✓
            </span>
            <h3 className="bmb-publish__results-title">
              {errors && errors.length > 0
                ? 'Published with some errors'
                : 'Published'}
            </h3>
          </div>
          <div className="bmb-publish__artifacts">
            {artifacts.map((artifact) => (
              <SurfaceCard key={artifact.surface} artifact={artifact} />
            ))}
            {errors?.map((err) => {
              const meta = SURFACE_META[err.surface];
              return (
                <div
                  key={err.surface}
                  className="bmb-publish__artifact-error"
                  role="alert"
                >
                  <span className="bmb-publish__artifact-error-icon" aria-hidden="true">
                    ⚠
                  </span>
                  <div>
                    <strong>{meta.label}</strong>
                    <p>{err.error}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bmb-publish__results-actions">
            <button
              type="button"
              className="bmb-publish__results-publish-more"
              onClick={() => {
                setPhase('idle');
                setArtifacts([]);
                setErrors(undefined);
              }}
            >
              Publish more
            </button>
            {onClose && (
              <button
                type="button"
                className="bmb-publish__results-done"
                onClick={onClose}
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
