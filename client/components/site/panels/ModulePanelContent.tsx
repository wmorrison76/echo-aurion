/**
 * Renders module panel content by panelKey at render time.
 * Used when panel entry has no stored element (e.g. after persistence or to avoid stale elements).
 */

import React, { useState, useEffect, useRef } from "react";
import { PANEL_REGISTRY, type PanelKey, isValidPanelKey } from "@/lib/panel-registry";
import { moduleCache } from "@/lib/module-cache";
import { captureException } from "@/lib/sentry-init";

const LOADING = (
  <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 text-foreground/60">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
    <p className="text-sm">Loading…</p>
  </div>
);

class ModuleErrorBoundary extends React.Component<
  { panelKey: string; panelTitle: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, {
      source: "ModulePanelContent.ModuleErrorBoundary",
      panelKey: this.props.panelKey,
      panelTitle: this.props.panelTitle,
      componentStack: info?.componentStack ?? undefined,
    });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 text-destructive bg-destructive/10 rounded border border-destructive/50 text-sm">
          <p className="font-semibold mb-2">Panel failed to render</p>
          <p className="break-words text-sm mb-4">{this.state.error.message}</p>
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-destructive/20 hover:bg-destructive/30"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ERROR = (msg: string, panelKey?: string) => (
  <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 text-destructive bg-destructive/10 rounded border border-destructive/50 text-sm">
    <p className="font-semibold mb-2">Panel failed to load</p>
    <p className="break-words mb-3">{msg}</p>
    {panelKey && (
      <div className="text-xs text-destructive/70 font-mono mb-3 p-2 bg-destructive/5 rounded w-full">
        <p className="font-bold mb-1">Panel Key:</p>
        <p className="break-all">{panelKey}</p>
      </div>
    )}
    <p className="text-xs text-destructive/60 mb-2">
      Check the browser console (F12) for more details. If the problem persists, try refreshing the page.
    </p>
  </div>
);

/** Phase 1 diagnostic (plan: Culinary Panel No-Render): minimal component to test if panel slot has a visible area.
 * When enabled, Culinary panel shows this instead of the real module. If you see the red box → slot is fine, bug is in module.
 * If you don't see it → slot/portal layout is broken. Remove or set USE_SLOT_TEST to false once done. */
const USE_SLOT_TEST = false;
const PANEL_SLOT_TEST = (
  <div
    style={{
      background: "red",
      minHeight: 300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "bold",
      fontSize: 16,
    }}
  >
    Panel slot test
  </div>
);

interface ModulePanelContentProps {
  panelKey: string;
  panelTitle: string;
  panelId?: string;
  isMinimized?: boolean;
  panelProps?: Record<string, unknown>;
}

export function ModulePanelContent({
  panelKey: panelKeyProp,
  panelTitle,
  panelId,
  isMinimized = false,
  panelProps = {},
}: ModulePanelContentProps) {
  // Normalize to string so we never pass undefined and cause multiple panels to share the same key
  const panelKey = typeof panelKeyProp === "string" && panelKeyProp.length > 0 ? panelKeyProp : "unknown";
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moduleUnloaded, setModuleUnloaded] = useState(false);

  // Handle panel minimize/expand for memory management
  useEffect(() => {
    if (!panelId) return;

    if (isMinimized) {
      // Signal module cache that panel is minimized
      moduleCache.signalPanelMinimized(panelId);
    } else {
      // Signal module cache that panel is expanded
      moduleCache.signalPanelExpanded(panelId);
    }
  }, [isMinimized, panelId]);

  // Load module component
  useEffect(() => {
    // Only reset if the panelKey actually changed (not on minimize/expand)
    if (panelKey === "unknown" || !isValidPanelKey(panelKey as PanelKey)) {
      const msg = `Invalid panel key: ${panelKey}`;
      setError(msg);
      if (panelKey !== "unknown") {
        captureException(new Error(msg), {
          source: "ModulePanelContent.load",
          panelKey,
          panelTitle,
          reason: "invalid_panel_key",
        });
      }
      return;
    }
    const loader = PANEL_REGISTRY[panelKey as PanelKey];
    if (!loader) {
      const msg = `No loader for panel: ${panelKey}`;
      console.error(`[ModulePanelContent] ${msg}`);
      console.warn(
        `[ModulePanelContent] Available panels:`,
        Object.keys(PANEL_REGISTRY).slice(0, 50)
      );
      setError(msg);
      captureException(new Error(msg), {
        source: "ModulePanelContent.load",
        panelKey,
        panelTitle,
        reason: "no_loader",
      });
      return;
    }
    let cancelled = false;

    console.log(`[ModulePanelContent] Loading panel: ${panelKey}`);

    moduleCache
      .load(panelKey, loader)
      .then((mod) => {
        if (!cancelled) {
          if (mod?.default) {
            console.log(
              `[ModulePanelContent] Successfully loaded panel: ${panelKey}`
            );
            setComponent(() => mod.default);
            // Register panel with module cache if we have a panelId
            if (panelId) {
              moduleCache.registerPanel(panelId, panelKey, isMinimized);
            }
          } else {
            const message = `Module ${panelKey} has no default export`;
            console.error(`[ModulePanelContent] ${message}`);
            setError(message);
            captureException(new Error(message), {
              source: "ModulePanelContent.load",
              panelKey,
              panelTitle,
              reason: "no_default_export",
              moduleKeys: mod ? Object.keys(mod) : [],
            });
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err?.message ?? String(err);
          console.error(
            `[ModulePanelContent] Failed to load panel ${panelKey}:`,
            err
          );
          setError(message);
          captureException(err instanceof Error ? err : new Error(message), {
            source: "ModulePanelContent.load",
            panelKey,
            panelTitle,
            reason: "module_load_failed",
            errorStack: err instanceof Error ? err.stack : undefined,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [panelKey]);

  if (error) return ERROR(error, panelKey !== "unknown" ? panelKey : undefined);
  if (!Component) return LOADING;

  return (
    <ModulePanelContentInner
      panelKey={panelKey}
      panelTitle={panelTitle}
      panelProps={panelProps}
      Component={Component}
    />
  );
}

/** Inner wrapper that mounts the module and can detect "no visible content" after a delay */
function ModulePanelContentInner({
  panelKey,
  panelTitle,
  panelProps,
  Component,
}: {
  panelKey: string;
  panelTitle: string;
  panelProps: Record<string, unknown>;
  Component: React.ComponentType<any>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const useSlotTest = USE_SLOT_TEST && panelKey === "culinary";

  useEffect(() => {
    const t = setTimeout(() => {
      const el = contentRef.current;
      if (!el) return;
      const scrollHeight = el.scrollHeight;
      const offsetHeight = el.offsetHeight;
      const hasNoMeaningfulContent = scrollHeight < 80 && offsetHeight >= 180;
      if (hasNoMeaningfulContent && import.meta.env.DEV) {
        setShowEmptyHint(true);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [panelKey]);

  return (
    <div
      ref={rootRef}
      className="panel-content-root flex flex-col flex-1 min-h-0 w-full overflow-hidden bg-background"
      data-panel-key={panelKey}
      style={{ minHeight: 200 }}
    >
      <ModuleErrorBoundary panelKey={panelKey} panelTitle={panelTitle}>
        <div
          ref={contentRef}
          className="flex flex-col flex-1 min-h-0 w-full overflow-hidden bg-background"
          style={{ minHeight: 200 }}
        >
          {/* Module slot: inline styles only — no height:100% so no 0-resolve from #panel-host (FIX-PANEL-HOST-ROOT-CAUSE) */}
          <div
            ref={slotRef}
            className="flex flex-col flex-1 min-h-0 w-full relative bg-background"
            style={{
              display: "flex",
              flexDirection: "column",
              flex: "1 1 auto",
              minHeight: 400,
              overflow: "auto",
            }}
            data-panel-slot
          >
            {useSlotTest ? PANEL_SLOT_TEST : <Component key={panelKey} {...(panelProps || {})} />}
          </div>
          {showEmptyHint && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground text-sm p-4 text-center pointer-events-none"
              aria-live="polite"
            >
              <span>
                Panel may not have rendered (no visible content detected). Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Cmd+Shift+D</kbd> for
                diagnostic.
              </span>
            </div>
          )}
        </div>
      </ModuleErrorBoundary>
    </div>
  );
}
