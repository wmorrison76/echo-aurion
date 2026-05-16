/**
 * components/Publishing/SurfaceCard.tsx
 * ----------------------------------------------------------------------------
 * Renders a single PublishedArtifact:
 *   - URL artifacts: download/open button + copy URL
 *   - Inline content (web HTML): preview iframe + copy
 *   - Both: surface icon, label, generated timestamp, file size
 *
 * Inline web preview renders in a sandboxed iframe so the published menu's
 * styles don't leak into the parent app.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useCallback } from 'react';
import type { PublishedArtifact } from '../../BanquetMenuBuilder.p5.types';
import { SURFACE_META } from '../../services/publishingService';

interface SurfaceCardProps {
  artifact: PublishedArtifact;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({ artifact }) => {
  const meta = SURFACE_META[artifact.surface];
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const handleCopyLink = useCallback(async () => {
    if (!artifact.url) return;
    try {
      await navigator.clipboard.writeText(artifact.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Browser doesn't expose clipboard — gracefully ignore
    }
  }, [artifact.url]);

  const handleDownloadInline = useCallback(() => {
    if (!artifact.content) return;
    const blob = new Blob([artifact.content], { type: artifact.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameFor(artifact);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [artifact]);

  return (
    <div className="bmb-surface-card bmb-surface-card--result">
      <div className="bmb-surface-card__header">
        <span className="bmb-surface-card__icon" aria-hidden="true">
          {meta.icon}
        </span>
        <div className="bmb-surface-card__heading">
          <span className="bmb-surface-card__label">{meta.label}</span>
          <span className="bmb-surface-card__meta">
            {artifact.size !== undefined && formatBytes(artifact.size)}
            {artifact.size !== undefined && ' • '}
            {formatRelativeTime(artifact.generatedAt)}
          </span>
        </div>
      </div>

      {/* URL-based artifacts */}
      {artifact.url && (
        <div className="bmb-surface-card__actions">
          <a
            href={artifact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bmb-surface-card__primary"
          >
            Open
          </a>
          <button
            type="button"
            className="bmb-surface-card__secondary"
            onClick={handleCopyLink}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}

      {/* Inline content artifacts (web preview) */}
      {artifact.content && !artifact.url && (
        <>
          <div className="bmb-surface-card__actions">
            <button
              type="button"
              className="bmb-surface-card__primary"
              onClick={() => setPreviewExpanded((p) => !p)}
            >
              {previewExpanded ? 'Hide preview' : 'Show preview'}
            </button>
            <button
              type="button"
              className="bmb-surface-card__secondary"
              onClick={handleDownloadInline}
            >
              Download
            </button>
          </div>

          {previewExpanded && (
            <div className="bmb-surface-card__preview">
              <iframe
                title={`${meta.label} preview`}
                srcDoc={artifact.content}
                sandbox="allow-same-origin"
                className="bmb-surface-card__preview-frame"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function filenameFor(artifact: PublishedArtifact): string {
  const ext = mimeToExt(artifact.contentType);
  return `menu-${artifact.surface}-${Date.now()}${ext}`;
}

function mimeToExt(mime: string): string {
  if (mime.includes('html')) return '.html';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('json')) return '.json';
  if (mime.includes('text')) return '.txt';
  return '';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
