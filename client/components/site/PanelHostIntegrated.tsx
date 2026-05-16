/**
 * PanelHost Integrated
 * Full migration of PanelHost.tsx to use new modular architecture
 * 
 * This component integrates the new panel system with existing event handlers
 * and maintains full backward compatibility
 */

import React, { useEffect, useRef, useState, Suspense, lazy, ReactNode, useCallback } from "react";
import { PanelContainer } from "./panels/PanelContainer";
import type { PanelId, PanelEntry } from "./panels/types";
import { usePanelStoreEnhanced } from "@/lib/stores/panel-store-enhanced";
import { PANEL_REGISTRY, PANEL_METADATA, type PanelKey, isValidPanelKey, preloadModule } from "@/lib/panel-registry";
import { captureException } from "@/lib/sentry-init";
import { osBus } from "@/lib/os-bus";
import type { PanelLayout } from "@/lib/panel-controller";
import { calculateGridLayout, calculateCascadeLayout } from "@/lib/panel-controller";
import { calculateResponsivePanelSize, calculateDefaultPosition } from "./panels/PanelLayout";
import { useAuth as useJwtAuth } from "@/lib/auth-context";
import { getBrandIcon } from "@/lib/brand-icon-registry";

// iter265 · Resolve the best brand icon for a panel entry so the dock
// shows the gold-on-black mark when the panel is minimized.
function resolveDockIcon(entry: PanelEntry): { icon: string | undefined; isImageIcon: boolean } {
  const brand = getBrandIcon(entry.id, entry.icon ?? undefined);
  if (brand) return { icon: brand, isImageIcon: true };
  const meta = PANEL_METADATA[entry.id as PanelKey]?.icon;
  if (meta && meta.startsWith("http")) return { icon: meta, isImageIcon: true };
  return { icon: entry.icon ?? meta, isImageIcon: !!entry.isImageIcon };
}

// iter259 · Per-role landing panels — open this instead of the generic
// "dashboard" when a user with this role boots. Falls back to "dashboard".
// Echo Chronos is the "operational time machine" landing for every salaried
// role that oversees one or more outlets. Role-based outlet scoping is
// enforced on the backend (see /api/chronos/portfolio).
//
// iter266 · Per William: Owners + Executive Committee + Directors + Exec-level
// chefs all land on Chronos. Managers (line-level) land on the standard
// dashboard which keeps the same UI/UX language but lighter scope.
// Admin / Owner explicitly added so IT admins don't see the revenue dashboard.
const ROLE_LANDING_PANEL: Record<string, string> = {
  // Ownership / IT
  "owner":              "chronos",
  "admin":              "chronos",
  // Executive Committee + Directors
  "regional-director":  "chronos",
  "director":           "chronos",
  "exec-dir-finance":   "chronos",
  "fb-director":        "chronos",
  "spa-director":       "chronos",
  "ird-manager":        "chronos",
  "dir-engineering":    "chronos",
  "dir-banquets":       "chronos",
  "senior-art-media-director": "chronos",
  // General Manager line
  "general-manager":    "chronos",
  "gm":                 "chronos",
  // Executive-level kitchen leadership
  "executive-chef":     "chronos",
  "exec_chef":          "chronos",
  "exec-chef-banquets": "chronos",
  "chef-de-cuisine":    "chronos",
  "pastry-chef":        "chronos",
  "pastry_chef":        "chronos",
  // Finance / Ops executives
  "controller":         "chronos",
  "operation-controller": "chronos",
  "accounting":         "chronos",
  "purchasing-manager": "chronos",
  // Sales / Marketing leadership
  "bqt-sales-marketing": "chronos",
  "sales":              "chronos",
  // Events leadership (exec)
  "events_director":    "chronos",
  // ── Manager line (LUCCCA Manager Dashboard — auto-scoped to outlets) ──
  // iter266.3 · Per William, line managers land on the renamed
  // "LUCCCA Manager Dashboard" (was Executive Dashboard) which auto-feeds
  // the outlets the user is assigned to. Same UI/UX language as Chronos.
  "sous-chef":          "luccca-jarvis-dashboard",
  "bar_manager":        "luccca-jarvis-dashboard",
  "bar-manager":        "luccca-jarvis-dashboard",
  "events-manager":     "luccca-jarvis-dashboard",
  "dining-room-manager": "luccca-jarvis-dashboard",
  "spa-manager":        "luccca-jarvis-dashboard",
};

// System panel components
const ZaroPanel = lazy(() => import("@/modules/Zaro"));
const EchoCoderPanel = lazy(() => import("@/components/studio/EchoCoderPanel"));
const RestaurantDashboard = lazy(() => import("@/components/dashboard/RestaurantDashboard"));
const WhiteboardModule = lazy(() => import("@/modules/Whiteboard"));
const StickyNotesModule = lazy(() => import("@/modules/StickyNotes"));
const VideoConferenceModule = lazy(() => import("@/modules/VideoConference"));
const NetworkChat = lazy(() => import("@/components/site/NetworkChat"));
const ChatSettings = lazy(() => import("@/components/site/ChatSettings"));
const SystemSettingsModule = lazy(() => import("@/components/site/SystemSettings"));

// System panel registry
const SYSTEM_PANELS: Record<string, {
  metadata: {
    defaultWidth: number;
    defaultHeight: number;
    icon?: string;
    title?: string;
  };
  element: ReactNode;
}> = {
  zaro: {
    metadata: { defaultWidth: 800, defaultHeight: 600, icon: "🔐", title: "ZARO Guardian" },
    element: <ZaroPanel />,
  },
  settings: {
    metadata: { defaultWidth: 500, defaultHeight: 400, icon: "⚙️", title: "Settings" },
    element: <SystemSettingsModule />,
  },
  echo: {
    metadata: { defaultWidth: 800, defaultHeight: 600, icon: "🤖", title: "EchoCoder" },
    element: <EchoCoderPanel />,
  },
  dashboard: {
    metadata: {
      defaultWidth: 700,
      defaultHeight: 550,
      icon: "",
      title: "Dashboard",
    },
    element: <RestaurantDashboard />,
  },
  "network-chat": {
    metadata: { defaultWidth: 350, defaultHeight: 380, icon: "💬", title: "Network Chat" },
    element: <NetworkChat />,
  },
  "chat-settings": {
    metadata: { defaultWidth: 400, defaultHeight: 450, icon: "⚙️", title: "Chat Settings" },
    element: <ChatSettings />,
  },
  whiteboard: {
    metadata: { defaultWidth: 900, defaultHeight: 650, icon: "✏️", title: "Whiteboard" },
    element: <WhiteboardModule />,
  },
  notes: {
    metadata: { defaultWidth: 500, defaultHeight: 500, icon: "📝", title: "Sticky Notes" },
    element: <StickyNotesModule />,
  },
  video: {
    metadata: { defaultWidth: 1100, defaultHeight: 700, icon: "📹", title: "Video Conference" },
    element: <VideoConferenceModule />,
  },
};

const INITIAL_Z_INDEX = 20010;

/** Catches render errors from panel content so we show a message instead of blank. */
class PanelContentErrorBoundary extends React.Component<
  { panelKey: string; panelTitle: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[PanelHostIntegrated] Panel "${this.props.panelTitle}" (${this.props.panelKey}) threw during render:`, error, info.componentStack);
    try {
      captureException(error, { source: "PanelHostIntegrated.PanelContentErrorBoundary", panelKey: this.props.panelKey, componentStack: info?.componentStack });
    } catch (_) { /* Sentry not available */ }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 overflow-auto rounded border border-amber-500/70 bg-amber-500/15 text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-2">Panel failed to render</p>
          <p className="text-sm mb-4 max-w-md break-words">{this.state.error.message}</p>
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-amber-950 hover:bg-amber-600"
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

export function PanelHostIntegrated() {
  const store = usePanelStoreEnhanced();
  const {
    panels: storePanels,
    getPanel,
    getOpenPanels,
    addPanel,
    removePanel,
    updatePanel,
    minimizePanel,
    setPanelPosition,
    setPanelSize,
    toggleExpand,
    getMaxZIndex,
    getNextZIndex,
    isInitialized,
    isRestoringPanels,
    restorationPhase,
    initialize,
  } = store;

  const pendingPanelsRef = useRef<Set<string>>(new Set());
  const autoOpenedRef = useRef(false);
  const openingLockRef = useRef(false);
  const [showRestorationBanner, setShowRestorationBanner] = useState(false);

  // Open panel function - handles both system and module panels
  const openPanel = useCallback(async (
    id: PanelId,
    tab?: string,
    panelProps?: Record<string, any>
  ) => {
    const {
      getOpenPanels,
      addPanel,
      removePanel,
      updatePanel,
      getNextZIndex,
    } = usePanelStoreEnhanced.getState();

    console.debug("[PanelHostIntegrated.openPanel] Opening panel:", id, { tab, hasProps: !!panelProps });

    if (pendingPanelsRef.current.has(id)) {
      console.log("[PanelHostIntegrated.openPanel] Panel already pending:", id);
      return;
    }

    // Prevent stacking from rapid clicks - serialize panel opens
    if (openingLockRef.current) {
      console.log("[PanelHostIntegrated.openPanel] Another panel is opening, queuing:", id);
      // Wait briefly then retry
      await new Promise(r => setTimeout(r, 100));
      if (openingLockRef.current) return; // Still locked, skip
    }
    openingLockRef.current = true;

    // When opening a non-dashboard panel, close the dashboard to avoid stacking
    if (id !== "dashboard") {
      const currentPanels = getOpenPanels();
      const dashPanel = currentPanels.find(p => p.entry.id === "dashboard");
      if (dashPanel) {
        await removePanel("dashboard" as PanelId);
      }
    }

    // Use get() to get current state without creating dependency on storePanels
    const currentPanels = getOpenPanels();
    const existingPanel = currentPanels.find(p => p.entry.id === id);

    if (existingPanel) {
      console.log("[PanelHostIntegrated.openPanel] Panel already open, focusing:", id);
      // Panel already open - just focus and unminimize
      const nextZ = getNextZIndex();
      updatePanel(id, {
        zIndex: nextZ,
        isMinimized: false,
        isExpanded: false,
      });
      openingLockRef.current = false;
      return;
    }

    pendingPanelsRef.current.add(id);

    try {
      // Check if system panel
      const isSystemPanel = Object.keys(SYSTEM_PANELS).includes(id as string);

      if (isSystemPanel) {
        // Handle system panel
        let sysPanel = SYSTEM_PANELS[id as string];

        // Special handling for settings panel with tab
        if (id === "settings" && tab && sysPanel) {
          // For settings panel with tab, we need to wrap SystemSettings
          // Note: SystemSettings doesn't directly support initialTab, but this maintains compatibility
          sysPanel = {
            ...sysPanel,
            element: <SystemSettingsModule />,
          };
        }

        // Sticky Notes system panel requires panelId and onDelete
        if (id === "notes" && sysPanel) {
          sysPanel = {
            ...sysPanel,
            element: (
              <Suspense fallback={<div className="p-6 text-foreground/60">Loading…</div>}>
                <StickyNotesModule
                  panelId="notes"
                  onDelete={() => removePanel("notes")}
                />
              </Suspense>
            ),
          };
        }

        // Video Conference system panel requires panelId, onClose, isEmbedded; optional context for deep links
        if (id === "video" && sysPanel) {
          const ctx = panelProps || {};
          sysPanel = {
            ...sysPanel,
            element: (
              <Suspense fallback={<div className="p-6 text-foreground/60">Loading…</div>}>
                <VideoConferenceModule
                  panelId="video"
                  onClose={() => removePanel("video")}
                  isEmbedded={true}
                  tableId={ctx.tableId}
                  servicePeriodId={ctx.servicePeriodId}
                  boardId={ctx.boardId}
                  tableLabel={ctx.tableLabel}
                />
              </Suspense>
            ),
          };
        }

        const { width, height } = calculateResponsivePanelSize(
          window.innerWidth,
          window.innerHeight,
          sysPanel.metadata.defaultWidth,
          sysPanel.metadata.defaultHeight
        );

        const openPanelCount = getOpenPanels().filter(
          (p) => !p.isMinimized
        ).length;

        const { x, y } = calculateDefaultPosition(openPanelCount, { width, height }, window.innerWidth, window.innerHeight);

        const zIndex = getNextZIndex();

        const panelEntry: PanelEntry = {
          id,
          title: sysPanel.metadata.title || id.charAt(0).toUpperCase() + id.slice(1),
          panelKey: id,
          element: sysPanel.element,
          defaultWidth: width,
          defaultHeight: height,
          icon: sysPanel.metadata.icon || "📦",
          isImageIcon: sysPanel.metadata.icon?.startsWith("http") ?? false,
        };

        addPanel(id, {
          entry: panelEntry,
          position: { x, y },
          size: { width, height },
          isMinimized: false,
          isExpanded: false,
          panelProps: panelProps || {},
        });

        pendingPanelsRef.current.delete(id);
        openingLockRef.current = false;
        return;
      }

      // Handle module panel (from registry)
      const panelKey = id as PanelKey;
      if (!isValidPanelKey(panelKey)) {
        console.error("[PanelHostIntegrated] Invalid panel key:", panelKey);
        pendingPanelsRef.current.delete(id);
        openingLockRef.current = false;
        return;
      }

      const metadata = PANEL_METADATA[panelKey];
      if (!metadata) {
        console.error("[PanelHostIntegrated] No metadata for panel:", panelKey);
        pendingPanelsRef.current.delete(id);
        openingLockRef.current = false;
        return;
      }

      // Add module panel with panelKey only; Panel will render content via ModulePanelContent at render time (avoids stale/missing element)
      const loadPanel = async () => {
        const { width, height } = calculateResponsivePanelSize(
          window.innerWidth,
          window.innerHeight,
          metadata.defaultWidth,
          metadata.defaultHeight
        );

        const openPanelCount = getOpenPanels().filter(
          (p) => !p.isMinimized
        ).length;

        const { x, y } = calculateDefaultPosition(openPanelCount, { width, height }, window.innerWidth, window.innerHeight);

        const panelEntry: PanelEntry = {
          id: panelKey,
          title: metadata.label || panelKey,
          panelKey,
          defaultWidth: width,
          defaultHeight: height,
          icon: metadata.icon || "📦",
          isImageIcon: metadata.icon?.startsWith("http") ?? false,
        };

        addPanel(panelKey, {
          entry: panelEntry,
          position: { x, y },
          size: { width, height },
          isMinimized: false,
          isExpanded: false,
          panelProps: panelProps || {},
        });
      };

      await loadPanel();
      pendingPanelsRef.current.delete(id);
      openingLockRef.current = false;
    } catch (error) {
      console.error("[PanelHostIntegrated] Error opening panel:", error);
      pendingPanelsRef.current.delete(id);
      openingLockRef.current = false;
    }
  }, []);

  // Initialize store on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Handle restoration phase UI feedback
  useEffect(() => {
    if (isRestoringPanels) {
      setShowRestorationBanner(true);
    } else {
      // Hide banner when restoration is complete
      setShowRestorationBanner(false);
    }
  }, [isRestoringPanels]);

  // iter258 · Read JWT user role to pick the role-specific landing panel.
  const jwtAuth = (() => { try { return useJwtAuth(); } catch { return null; } })();
  const jwtRole = (jwtAuth?.user?.role || "").toLowerCase();

  // Auto-open role landing panel if no panels are open after initialization.
  // Director → atlas. Everyone else falls through to the generic dashboard.
  // Skipped if we're restoring previously-saved panels.
  useEffect(() => {
    if (isInitialized && !autoOpenedRef.current && !isRestoringPanels) {
      const currentPanels = getOpenPanels();
      if (currentPanels.length === 0) {
        const target = ROLE_LANDING_PANEL[jwtRole] || "dashboard";
        console.log(`[PanelHostIntegrated] No panels open, auto-opening landing for role="${jwtRole || "default"}":`, target);
        openPanel(target as PanelId);
      }
      autoOpenedRef.current = true;
    }
  }, [isInitialized, isRestoringPanels, getOpenPanels, openPanel, jwtRole]);

  // Event handlers
  useEffect(() => {
    console.debug("[PanelHostIntegrated] Initializing event handlers, isInitialized:", isInitialized);

    // OS Bus subscription for open-panel events
    const unsubOsBusOpenPanel = osBus.on(
      "ui:open_panel",
      ({ panelKey, payload }) => {
        console.debug("[PanelHostIntegrated] OS Bus ui:open_panel received:", panelKey);
        const detail: Record<string, any> = { id: panelKey };
        if (payload && typeof payload === "object") {
          Object.assign(detail, payload as any);
        } else if (payload !== undefined) {
          detail.payload = payload;
        }
        window.dispatchEvent(new CustomEvent("open-panel", { detail }));
      },
    );

    const handleOpenPanel = (e: Event) => {
      const detail = (e as CustomEvent<{ id: PanelId; tab?: string; panelProps?: Record<string, any> }>).detail;
      console.debug("[PanelHostIntegrated] window open-panel event received:", detail?.id);
      if (detail?.id) {
        // Use the callback from the latest render to avoid stale closure issues
        // or just use store.getState() if we wanted to be even more direct
        openPanel(detail.id, detail.tab, detail.panelProps);
      }
    };

    const handleRestorePanel = (e: Event) => {
      const detail = (e as CustomEvent<{ id: PanelId }>).detail;
      if (detail?.id) {
        const { getPanel, getNextZIndex, updatePanel } = usePanelStoreEnhanced.getState();
        const panel = getPanel(detail.id);
        if (panel) {
          // Restore means unminimize
          const nextZ = getNextZIndex();
          updatePanel(detail.id, {
            isMinimized: false,
            isExpanded: false,
            zIndex: nextZ,
          });
        }
      }
    };

    const handleCreateStickyNote = (e: Event) => {
      const detail = (e as CustomEvent<{ panelId: string }>).detail;
      if (!detail?.panelId) return;
      const panelId = detail.panelId as PanelId;

      const { getPanel, getNextZIndex, updatePanel, getOpenPanels, addPanel, removePanel, setPanelSize } = usePanelStoreEnhanced.getState();

      if (getPanel(panelId)) {
        const nextZ = getNextZIndex();
        updatePanel(panelId, { zIndex: nextZ, isMinimized: false, isExpanded: false });
        return;
      }
      const width = 225;
      const height = 225;
      let savedPosition: { x: number; y: number } | undefined;
      try {
        const saved = localStorage.getItem("sticky-notes-positions");
        if (saved) savedPosition = JSON.parse(saved)[panelId as string];
      } catch {}
      const openPanelCount = getOpenPanels().filter(
        (p) => !p.isMinimized
      ).length;
      const { x, y } = savedPosition ?? calculateDefaultPosition(openPanelCount, { width, height }, window.innerWidth, window.innerHeight);
      const zIndex = getNextZIndex();
      const panelEntry: PanelEntry = {
        id: panelId,
        title: "Sticky Note",
        panelKey: panelId,
        element: (
          <Suspense fallback={<div className="p-6 text-foreground/60">Loading…</div>}>
            <StickyNotesModule
              panelId={panelId as string}
              onDelete={() => removePanel(panelId)}
              onResize={(size) => setPanelSize(panelId, size)}
            />
          </Suspense>
        ),
        defaultWidth: width,
        defaultHeight: height,
        icon: "📝",
        isImageIcon: false,
      };
      addPanel(panelId, {
        entry: panelEntry,
        position: { x, y },
        size: { width, height },
        isMinimized: false,
        isExpanded: false,
        panelProps: {},
      });
    };

    const handleDockAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string; payload?: Record<string, any> }>).detail;
      if (!detail) return;

      const { action } = detail;

      if (action === "echo-ai-toggle") {
        queueMicrotask(() => {
          window.dispatchEvent(new CustomEvent("echo-ai-toggle"));
        });
        return;
      }

      const { getOpenPanels, removePanel, getPanel, minimizePanel, updatePanel } = usePanelStoreEnhanced.getState();
      const allPanels = getOpenPanels();
      const panelIds = allPanels.map((p) => p.entry.id);

      switch (action) {
        case "close-all":
          Promise.all(panelIds.map((id) => removePanel(id))).then(() => {
            panelIds.forEach((id) => {
              window.dispatchEvent(new CustomEvent("restore-panel", { detail: { id } }));
            });
          });
          break;

        case "minimize-all":
          panelIds.forEach((id) => {
            const panel = getPanel(id);
            if (panel) {
              minimizePanel(id);
              const { icon, isImageIcon } = resolveDockIcon(panel.entry);
              window.dispatchEvent(
                new CustomEvent("panel-minimized", {
                  detail: {
                    id: panel.entry.id,
                    title: panel.entry.title,
                    icon,
                    isImageIcon,
                  },
                })
              );
            }
          });
          break;

        case "stack-grid": {
          const layout = calculateGridLayout(
            panelIds.map(String),
            window.innerWidth,
            window.innerHeight,
            Object.fromEntries(allPanels.map((p) => [String(p.entry.id), p.size.width || 800])),
            Object.fromEntries(allPanels.map((p) => [String(p.entry.id), p.size.height || 600]))
          );

          Object.entries(layout.positions).forEach(([id, pos]) => {
            const panelId = id as PanelId;
            updatePanel(panelId, {
              position: pos,
              isMinimized: false,
              isExpanded: false,
            });
          });
          break;
        }

        case "stack-cascade": {
          const layout = calculateCascadeLayout(
            panelIds.map(String),
            window.innerWidth,
            window.innerHeight
          );

          Object.entries(layout.positions).forEach(([id, pos]) => {
            const panelId = id as PanelId;
            updatePanel(panelId, {
              position: pos,
              isMinimized: false,
              isExpanded: false,
            });
          });
          break;
        }
      }
    };

    window.addEventListener("open-panel", handleOpenPanel);
    window.addEventListener("restore-panel", handleRestorePanel);
    window.addEventListener("dock-action", handleDockAction);
    window.addEventListener("create-sticky-note", handleCreateStickyNote);

    // Close-panel listener: enables sidebar navigation (closes previous panel)
    const handleClosePanel = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string };
      const key = detail?.id;
      if (!key) return;
      console.log("[PanelHostIntegrated] close-panel received for:", key);
      const store = usePanelStoreEnhanced.getState();
      const panel = store.getPanel(key as PanelId);
      if (panel) {
        console.log("[PanelHostIntegrated] Removing panel:", key);
        store.removePanel(key as PanelId);
      } else {
        console.log("[PanelHostIntegrated] Panel not found:", key, "Available:", Object.keys(store.getOpenPanels()));
      }
    };
    window.addEventListener("close-panel", handleClosePanel);

    return () => {
      console.debug("[PanelHostIntegrated] Cleaning up event handlers");
      unsubOsBusOpenPanel();
      window.removeEventListener("open-panel", handleOpenPanel);
      window.removeEventListener("restore-panel", handleRestorePanel);
      window.removeEventListener("dock-action", handleDockAction);
      window.removeEventListener("create-sticky-note", handleCreateStickyNote);
      window.removeEventListener("close-panel", handleClosePanel);
    };
  }, [openPanel, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  // Get open panels (non-minimized)
  const openPanels = getOpenPanels().filter((p) => !p.isMinimized);
  const maxZIndex = getMaxZIndex();

  // Render using PanelContainer with restoration banner
  return (
    <>
      {showRestorationBanner && (
        <div
          className="fixed top-0 left-0 right-0 z-[50000] bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 px-4 py-3 flex items-center justify-center gap-2"
          role="status"
          aria-label="Panels are being restored"
        >
          <div className="w-4 h-4 border-2 border-blue-300 dark:border-blue-600 border-t-blue-600 dark:border-t-blue-300 rounded-full animate-spin" />
          <span className="text-sm text-blue-900 dark:text-blue-100">
            Restoring panels… (Phase {restorationPhase})
          </span>
        </div>
      )}
      <PanelContainer
        panels={openPanels}
        maxZIndex={maxZIndex}
        onClose={(id) => removePanel(id as PanelId)}
        onMinimize={(id) => {
          const panel = getPanel(id as PanelId);
          if (panel) {
            minimizePanel(id as PanelId);
            const { icon, isImageIcon } = resolveDockIcon(panel.entry);
            window.dispatchEvent(
              new CustomEvent("panel-minimized", {
                detail: {
                  id: panel.entry.id,
                  title: panel.entry.title,
                  icon,
                  isImageIcon,
                },
              })
            );
          }
        }}
        onFocus={(id) => {
          const nextZ = getNextZIndex();
          const panelId = id as PanelId;
          updatePanel(panelId, { zIndex: nextZ });
        }}
        onResize={(id, size) => {
          const panelId = id as PanelId;
          setPanelSize(panelId, size);
        }}
        onPositionChange={(id, position) => {
          const panelId = id as PanelId;
          setPanelPosition(panelId, position);
        }}
        onToggleExpand={(id) => {
          const panelId = id as PanelId;
          toggleExpand(panelId);
        }}
      />
    </>
  );
}

export default PanelHostIntegrated;
