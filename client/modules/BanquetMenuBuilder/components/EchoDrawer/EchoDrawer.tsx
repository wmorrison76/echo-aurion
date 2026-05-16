/**
 * EchoDrawer.tsx
 * ----------------------------------------------------------------------------
 * The slide-out panel that opens when the user activates the orb. Hosts
 * one of three modes:
 *
 *   COMPOSE   — Echo proposes additions/removals to the current menu
 *   CRITIQUE  — Echo audits the current menu and surfaces issues
 *   GENERATE  — Echo creates a fresh menu from a brief
 *
 * The drawer is a focus trap when open. Escape closes it. It does NOT
 * cover the whole canvas — it slides in from the right, taking ~420px,
 * keeping the canvas + footer visible so the chef can see Echo's
 * suggestions in context.
 *
 * Mobile (<= 720px viewport):
 *   The drawer becomes a full-height bottom sheet covering 85vh.
 * ----------------------------------------------------------------------------
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useEchoOrb, type DrawerMode } from '../../hooks/useEchoOrb';
import { ComposeMode } from './ComposeMode';
import { CritiqueMode } from './CritiqueMode';
import { GenerateMode } from './GenerateMode';

const MODE_LABELS: Record<DrawerMode, string> = {
  compose: 'Compose',
  critique: 'Critique',
  generate: 'Generate',
};

const MODE_DESCRIPTIONS: Record<DrawerMode, string> = {
  compose: 'Suggest additions to the current menu',
  critique: 'Find issues and gaps',
  generate: 'Create a menu from a brief',
};

export const EchoDrawer: React.FC = () => {
  const drawerOpen = useEchoOrb((s) => s.drawerOpen);
  const drawerMode = useEchoOrb((s) => s.drawerMode);
  const drawerContext = useEchoOrb((s) => s.drawerContext);
  const closeDrawer = useEchoOrb((s) => s.closeDrawer);
  const setDrawerMode = useEchoOrb((s) => s.setDrawerMode);

  const drawerRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (!drawerOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    // Defer focus to next paint so the drawer is mounted
    const id = requestAnimationFrame(() => {
      const focusTarget = drawerRef.current?.querySelector<HTMLElement>(
        '[data-autofocus="true"], button, input, textarea',
      );
      focusTarget?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      lastFocusedRef.current?.focus?.();
    };
  }, [drawerOpen]);

  // Escape to close
  useEffect(() => {
    if (!drawerOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [drawerOpen, closeDrawer]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) closeDrawer();
    },
    [closeDrawer],
  );

  if (!drawerOpen) return null;

  return (
    <div
      className="bmb-echo-drawer__backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <aside
        ref={drawerRef}
        className="bmb-echo-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Echo assistant"
      >
        {/* ===== Header ===== */}
        <header className="bmb-echo-drawer__header">
          <div className="bmb-echo-drawer__title-block">
            <span className="bmb-echo-drawer__eyebrow">Echo</span>
            <h2 className="bmb-echo-drawer__title">{MODE_LABELS[drawerMode]}</h2>
            <p className="bmb-echo-drawer__subtitle">
              {MODE_DESCRIPTIONS[drawerMode]}
            </p>
          </div>
          <button
            type="button"
            className="bmb-echo-drawer__close"
            onClick={closeDrawer}
            aria-label="Close Echo"
          >
            ×
          </button>
        </header>

        {/* ===== Mode tabs ===== */}
        <nav className="bmb-echo-drawer__tabs" aria-label="Echo mode">
          {(['compose', 'critique', 'generate'] as DrawerMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={[
                'bmb-echo-drawer__tab',
                mode === drawerMode ? 'bmb-echo-drawer__tab--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setDrawerMode(mode)}
              aria-current={mode === drawerMode ? 'true' : undefined}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </nav>

        {/* ===== Mode body ===== */}
        <div className="bmb-echo-drawer__body">
          {drawerMode === 'compose' && <ComposeMode context={drawerContext} />}
          {drawerMode === 'critique' && <CritiqueMode context={drawerContext} />}
          {drawerMode === 'generate' && <GenerateMode context={drawerContext} />}
        </div>
      </aside>
    </div>
  );
};
