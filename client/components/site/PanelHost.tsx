import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  lazy,
  ReactNode,
  memo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import EchoCoderAccessGuard from "@/components/studio/EchoCoderAccessGuard";
import LanguageSelect from "./LanguageSelect";
import AvatarSelector from "./AvatarSelector";
import SettingsPanel from "./SettingsPanel";
import { PanelId, PanelState } from "./panels/types";
import {
  THEMES,
  FONTS,
  type ThemeName,
  type FontName,
  type AppearanceMode,
  type ThemePreferences,
  loadPreferences,
  applyTheme,
  savePreferences,
} from "@/lib/theme-manager";
import {
  PANEL_REGISTRY,
  PANEL_METADATA,
  PanelKey,
  isValidPanelKey,
  preloadModule,
} from "@/lib/panel-registry";
import { getBrandIcon } from "@/lib/brand-icon-registry";
import { moduleCache } from "@/lib/module-cache";
import { perfOptimizer } from "@/lib/performance-optimizer";
import { osBus } from "@/lib/os-bus";
import { GripVertical, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/glass";
import {
  calculateGridLayout,
  calculateCascadeLayout,
} from "@/lib/panel-controller";
import {
  CustomWidgetBuilder,
  type CustomWidget,
} from "@/components/dashboard/CustomWidgetBuilder";
import {
  loadPersistedPanelState,
  savePersistedPanelState,
  recordPanelOpen,
  recordPanelClose,
  savePanelLayout,
} from "@/lib/panel-persistence";

import * as Sentry from "@sentry/react";
import PanelErrorBoundary from "@/components/ui/PanelErrorBoundary";
import PanelRenderDiagnostic from "@/dev/PanelRenderDiagnostic";
import { useDiagPanelBridge } from "@/lib/diagnostics/panel-open-bridge";
import { diag } from "@/lib/diagnostics/diagnostic-core";
import { DiagErrorBoundary } from "@/lib/diagnostics/diag-error-boundary";
import { withDiagTracking } from "@/lib/diagnostics/with-diag-tracking";
import {
  LaborCostWidget,
  RevenueWidget,
  OccupancyWidget,
  OrdersWidget,
  DeliveryWidget,
  ClockWidget,
  VIPAlertsWidget,
  MessagesWidget,
  ScheduleConnectedWidget,
  SatisfactionWidget,
  SalesTrendWidget,
  GenericWidget,
} from "@/components/dashboard/DashboardWidgets";
import { StaffManagement } from "@/components/dashboard/StaffManagement";
import { StaffCoverageContent } from "@/components/dashboard/StaffCoverageMiniPanel";
import { ScheduleHUDContent } from "@/components/dashboard/ScheduleHUDWidget";
import { GoalsWidget } from "@/components/dashboard/GoalsWidget";

const ZaroPanel = lazy(() => import("@/modules/Zaro"));
const EchoCoderPanel = lazy(() => import("@/components/studio/EchoCoderPanel"));
const RestaurantDashboard = lazy(
  () => import("@/components/dashboard/RestaurantDashboard"),
);
// iter263.5 · Admin / Owner gets the Daily Operations Dashboard instead.
const AdminDailyDashboard = lazy(
  () => import("@/modules/AdminDailyDashboard"),
);
// auth context for role-aware dashboard pick
import { useAuth as useJwtAuth_PH } from "@/lib/auth-context";

function AdminAwareDashboard() {
  let role: string | undefined;
  try {
    const ctx = useJwtAuth_PH() as any;
    role = ctx?.user?.role;
  } catch { /* hook outside provider; fall through */ }
  if (!role) {
    try {
      const raw = localStorage.getItem("luccca-current-user");
      if (raw) role = JSON.parse(raw)?.role;
    } catch { /* */ }
  }
  if (role === "admin" || role === "owner") return <AdminDailyDashboard />;
  return <RestaurantDashboard />;
}
const StickyNotesModule = lazy(() => import("@/modules/StickyNotes"));
const StickyNotesPanel = lazy(() => import("@/components/site/StickyNotes"));
const NetworkChat = lazy(() => import("@/components/site/NetworkChat"));
const ChatSettings = lazy(() => import("@/components/site/ChatSettings"));
import { Panel } from "./panel-host/Panel";

/** Use PanelErrorBoundary (Sentry-wired) for panel content; see import above. */

// Memoize Panel component to prevent re-renders when parent updates
// Only re-render when panelState, isFocused, or callbacks change

export function PanelHost() {
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>({});
  const nextZIndexRef = useRef(20010);
  const pendingPanelsRef = useRef<Set<string>>(new Set());
  const loadingPanelsRef = useRef<Map<string, Promise<any>>>(new Map());
  const echoShortcutPrimedRef = useRef<number | null>(null);
  const openPanelQueueRef = useRef<Array<{ id: PanelId; tab?: string; panelProps?: Record<string, any> }>>([]);
  const isProcessingQueueRef = useRef(false);

  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = document.body.appendChild(document.createElement("div"));
    container.id = "panel-host";
    hostRef.current = container;

    return () => {
      if (hostRef.current) {
        document.body.removeChild(hostRef.current);
      }
    };
  }, []);

  // Restore persisted panel state on mount
  useEffect(() => {
    try {
      const persistedState = loadPersistedPanelState();
      console.debug(
        "[PanelHost] Loaded persisted state:",
        persistedState
      );

      // Note: We don't auto-restore panels on reload by default
      // as it could interfere with user experience. Instead, we have
      // the data available for when users explicitly request restoration
      // via a "Restore Previous Panels" button or similar feature.
    } catch (err) {
      console.warn("[PanelHost] Failed to restore persisted state:", err);
    }
  }, []);

  // Save panel state whenever panels change
  useEffect(() => {
    try {
      const persistedState = loadPersistedPanelState();
      persistedState.openPanels = Object.keys(panels);
      savePersistedPanelState(persistedState);
    } catch (err) {
      console.warn("[PanelHost] Failed to save panel state:", err);
    }
  }, [panels]);

  const closeAllPanels = useCallback(() => setPanels({}), []);

  // Open panel function - called from dock or open-panel events
  const openPanel = (
    id: PanelId,
    tab?: string,
    panelProps?: Record<string, any>,
  ) => {
    console.debug("[PanelHost.openPanel] Opening panel:", id, {
      tab,
      hasProps: !!panelProps,
    });

    if (!hostRef.current) {
      console.log("[PanelHost.openPanel] Cannot open panel: no host ref");
      return;
    }

    // Prevent duplicate opens - queue if already pending
    if (pendingPanelsRef.current.has(id)) {
      console.log("[PanelHost.openPanel] Panel already pending, skipping:", id);
      return;
    }

    // Throttle rapid panel opens to prevent crashes - queue if already processing
    if (isProcessingQueueRef.current) {
      openPanelQueueRef.current.push({ id, tab, panelProps });
      return;
    }

    pendingPanelsRef.current.add(id);

    try {
      // Check if system panel
      const isSystemPanel =
        id === "zaro" ||
        id === "echo" ||
        id === "settings" ||
        id === "dashboard" ||
        id === "network-chat" ||
        id === "chat-settings" ||
        id === "notes";

      console.log(
        "[PanelHost.openPanel] isSystemPanel:",
        isSystemPanel,
        "id:",
        id,
      );

      if (!isSystemPanel && isValidPanelKey(id as PanelKey)) {
        // Registry panel
        const panelKey = id as PanelKey;
        const metadata = PANEL_METADATA[panelKey];

        if (!metadata) {
          console.warn(`No metadata found for panel: ${panelKey}`);
          pendingPanelsRef.current.delete(id);
          return;
        }

        const loader = PANEL_REGISTRY[panelKey];
        if (!loader) {
          console.error(`[PanelHost] CRITICAL: No loader found for panel: ${panelKey}`);
          console.error(`[PanelHost] Available keys in PANEL_REGISTRY:`, Object.keys(PANEL_REGISTRY).slice(0, 20));
          pendingPanelsRef.current.delete(id);
          return;
        }

        // Validate loader is a function
        if (typeof loader !== "function") {
          console.error(`[PanelHost] CRITICAL: Loader for ${panelKey} is not a function:`, typeof loader, loader);
          pendingPanelsRef.current.delete(id);
          return;
        }

        const loadPanel = async () => {
          try {
            console.log(`[PanelHost] Loading panel: ${id}`, { panelKey, metadata, loaderType: typeof loader });
            
            // Step 1: Call loader function
            let moduleResult;
            try {
              console.log(`[PanelHost] Step 1: Calling loader() for ${panelKey}...`);
              moduleResult = await loader();
              console.log(`[PanelHost] Step 1: Loader returned:`, {
                hasResult: !!moduleResult,
                keys: moduleResult ? Object.keys(moduleResult) : [],
                hasDefault: !!(moduleResult && moduleResult.default),
                defaultType: moduleResult?.default ? typeof moduleResult.default : 'undefined',
              });
            } catch (loaderError) {
              console.error(`[PanelHost] Step 1 FAILED: Loader threw error:`, loaderError);
              throw new Error(`Loader function failed: ${loaderError instanceof Error ? loaderError.message : String(loaderError)}`);
            }

            // Step 2: Validate default export
            if (!moduleResult || !moduleResult.default) {
              console.error(`[PanelHost] Step 2 FAILED: No default export`, {
                moduleResult,
                keys: moduleResult ? Object.keys(moduleResult) : [],
                default: moduleResult?.default,
              });
              throw new Error(
                `Module ${panelKey} loaded but default export is undefined. ` +
                `Module keys: ${moduleResult ? Object.keys(moduleResult).join(", ") : "module is null"}. ` +
                `This usually means the module's index.tsx is missing 'export default'.`
              );
            }

            // Step 3: Use module cache (for caching, but we already have the module)
            console.log(`[PanelHost] Step 3: Using module cache for ${panelKey}...`);
            const { default: Component } = await perfOptimizer.timeAsync(
              `Load panel: ${id}`,
              "load",
              async () => {
                // Return the already-loaded module, but go through cache for consistency
                try {
                  return await moduleCache.load(panelKey, () => Promise.resolve(moduleResult));
                } catch (cacheError) {
                  console.warn(`[PanelHost] Module cache error for ${panelKey}, using direct result:`, cacheError);
                  return moduleResult;
                }
              },
              { panelKey },
            );
            
            if (!Component) {
              throw new Error(`Component is null/undefined after loading ${panelKey}`);
            }
            
            console.log(`[PanelHost] ✅ Successfully loaded panel: ${id}`, { ComponentType: typeof Component });

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let widthRatio = 0.7;
            if (viewportWidth < 768) widthRatio = 0.9;
            else if (viewportWidth < 1024) widthRatio = 0.85;
            else if (viewportWidth < 1440) widthRatio = 0.65;
            else if (viewportWidth < 1920) widthRatio = 0.7;
            else if (viewportWidth < 2560) widthRatio = 0.75;
            else widthRatio = 0.8;

            let heightRatio = 0.75;
            if (viewportHeight < 720)
              heightRatio = 0.8; // Mobile height
            else if (viewportHeight < 768)
              heightRatio = 0.8; // Mobile height
            else if (viewportHeight < 1080)
              heightRatio = 0.65; // Standard HD
            else if (viewportHeight < 1440)
              heightRatio = 0.7; // Full HD
            else heightRatio = 0.75; // High resolution

            const dashboardWidth = Math.max(
              Math.min(
                Math.round(viewportWidth * widthRatio),
                viewportWidth - 40,
              ),
              600, // Reduced minimum width for smaller screens
            );
            const dashboardHeight = Math.max(
              Math.min(
                Math.round(viewportHeight * heightRatio),
                viewportHeight - 40,
              ),
              450, // Reduced minimum height for smaller screens
            );

            const leftPadding = 50;
            const topPadding = 68;
            const edgePadding = 16;
            const safeWidth = Math.max(
              320,
              Math.min(
                dashboardWidth,
                viewportWidth - leftPadding - edgePadding,
              ),
            );
            const safeHeight = Math.max(
              240,
              Math.min(
                dashboardHeight,
                viewportHeight - topPadding - edgePadding,
              ),
            );

            // Calculate position using grid layout
            const openPanelIds = Object.keys(panels).filter(
              (panelId) => !panels[panelId as PanelId]?.isMinimized,
            ) as PanelId[];

            const openPanelCount = openPanelIds.length;
            const gridLayout = calculateGridLayout(
              [...openPanelIds, panelKey],
              window.innerWidth,
              window.innerHeight,
              Object.fromEntries(
                [...openPanelIds, panelKey].map((id) => [
                  id,
                  panels[id]?.size.width || dashboardWidth,
                ]),
              ),
              Object.fromEntries(
                [...openPanelIds, panelKey].map((id) => [
                  id,
                  panels[id]?.size.height || dashboardHeight,
                ]),
              ),
            );

            // Calculate safe default position that accounts for viewport
            const defaultPanelWidth = safeWidth || 800;
            const sidebarWidth = 256;
            const minMargin = 16;
            const cascadeOffsetPerPanel = 32;
            const maxCascadeOffset = 120; // Don't cascade more than 120px total to prevent off-screen

            const defaultX = Math.min(
              sidebarWidth + 50, // Start 50px from sidebar
              Math.max(
                sidebarWidth + minMargin, // But not less than sidebar + margin
                window.innerWidth - defaultPanelWidth - minMargin * 2, // And ensure panel fits on screen
              ),
            );

            // Clamp cascade to ensure panels stay on-screen
            const cascadeY = Math.min(
              openPanelCount * cascadeOffsetPerPanel,
              maxCascadeOffset,
            );

            const defaultY = Math.min(
              Math.max(
                70, // Standard cascade start
                48 + 20, // Below toolbar (48px) + padding
              ) + cascadeY,
              window.innerHeight - safeHeight - edgePadding,
            );

            const { x, y } = gridLayout.positions[panelKey] || {
              x: defaultX,
              y: defaultY,
            };
            const maxX = Math.max(
              leftPadding,
              viewportWidth - safeWidth - edgePadding,
            );
            const maxY = Math.max(
              topPadding,
              viewportHeight - safeHeight - edgePadding,
            );
            const clampedX = Math.min(Math.max(x, leftPadding), maxX);
            const clampedY = Math.min(Math.max(y, topPadding), maxY);

            // Get z-index for new panel
            const zIndex = 20010 + nextZIndexRef.current;
            nextZIndexRef.current++;

            // Registry panels: store Component + panelProps so Panel can inject onClose at render time
            const PanelContent = diag.isEnabled()
              ? withDiagTracking(Component, panelKey)
              : Component;
            const basePanelProps = {
              ...(panelProps || {}),
              panelId: panelKey,
              isEmbedded: true,
            };
            return {
              ...panels,
              [panelKey]: {
                entry: {
                  id: panelKey,
                  title: metadata.label,
                  panelKey: id,
                  Component: PanelContent,
                  panelProps: basePanelProps,
                  defaultWidth: safeWidth,
                  defaultHeight: safeHeight,
                  icon: metadata.icon,
                  isImageIcon: metadata.icon.startsWith("http"),
                },
                position: {
                  x: clampedX,
                  y: clampedY,
                },
                size: {
                  width: safeWidth,
                  height: safeHeight,
                },
                isMinimized: false,
                isExpanded: false,
                zIndex,
                panelProps: panelProps || {},
              },
            };
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            const errorStack = err instanceof Error ? err.stack : undefined;
            console.error(`Failed to load panel: ${id}`, errorMessage);
            console.error("Full error:", err);
            
            // Send to Sentry
            try {
              const { captureException } = await import("@/lib/sentry-init");
              captureException(err instanceof Error ? err : new Error(String(err)), {
                panel: String(id),
                errorType: "panel_load_failure",
                panelKey: String(id),
                metadata: metadata ? JSON.stringify(metadata) : undefined,
              });
            } catch (sentryError) {
              console.debug("[PanelHost] Sentry capture failed:", sentryError);
            }
            console.error("Panel metadata:", {
              id,
              metadata,
              hasLoader: !!loader,
            });
            console.error("Error details:", {
              message: errorMessage,
              stack: errorStack,
              type: typeof err,
            });
            throw err; // Re-throw to see in browser error handling
          } finally {
            // Clean up the loading promise cache
            loadingPanelsRef.current.delete(panelKey);
          }
        };

        // Use cached promise if already loading
        let loadPromise = loadingPanelsRef.current.get(panelKey);
        if (!loadPromise) {
          loadPromise = loadPanel();
          loadingPanelsRef.current.set(panelKey, loadPromise);
        }

        loadPromise
          .then((newPanels) => {
            if (newPanels && newPanels[panelKey]) {
              try {
                const zIndex = nextZIndexRef.current++;
                // Use functional update to avoid stale state
                setPanels((prev) => {
                  // Safety check: ensure panel still exists and host is mounted
                  if (!hostRef.current) {
                    console.warn(`[PanelHost] Host unmounted, skipping panel ${id}`);
                    return prev;
                  }
                  return {
                    ...prev,
                    [panelKey]: {
                      ...newPanels[panelKey],
                      zIndex,
                      isMinimized: false,
                      isExpanded: false,
                    },
                  };
                });
                try {
                  osBus.emit("audit:entry", {
                    entry: { type: "panel_open", panelId: panelKey, timestamp: Date.now() },
                    source: "PanelHost",
                  });
                } catch (_) {}
                // Record panel open for frequency tracking
                try {
                  recordPanelOpen(panelKey);
                } catch (err) {
                  console.warn("[PanelHost] Failed to record panel open:", err);
                }
              } catch (setStateError) {
                console.error(`[PanelHost] Error setting panel state for ${id}:`, setStateError);
                pendingPanelsRef.current.delete(id);
                // Don't throw - just log and continue
              }
            }
            pendingPanelsRef.current.delete(id);
            // Process queued panels if any
            if (openPanelQueueRef.current.length > 0 && !isProcessingQueueRef.current) {
              isProcessingQueueRef.current = true;
              const queue = [...openPanelQueueRef.current];
              openPanelQueueRef.current = [];
              // Process queue with staggered delays
              queue.forEach((item, index) => {
                setTimeout(() => {
                  openPanel(item.id, item.tab, item.panelProps);
                  if (index === queue.length - 1) {
                    setTimeout(() => {
                      isProcessingQueueRef.current = false;
                    }, 100);
                  }
                }, index * 150); // Stagger by 150ms
              });
            }
          })
          .catch(async (err) => {
            console.error(`[PanelHost] Failed to load panel ${id}:`, err);
            
            // CRITICAL FIX: Create error panel instead of silently failing
            // This prevents panels from "collapsing" and disappearing
            const errorMessage = err instanceof Error ? err.message : String(err);
            const errorStack = err instanceof Error ? err.stack : undefined;
            
            // Import ModuleFallback for error display
            let ErrorComponent: React.ComponentType<any>;
            try {
              const { ModuleFallback } = await import("@/components/module-fallback");
              ErrorComponent = ModuleFallback;
            } catch {
              // Fallback if ModuleFallback not available
              ErrorComponent = ({ moduleName, error: errorObj }: any) => (
                <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                  <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                    ❌ Failed to Load Module
                  </h3>
                  <p className="text-red-800 dark:text-red-200 text-sm mb-4">
                    {errorMessage}
                  </p>
                  {errorStack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-red-700 dark:text-red-400">
                        Error Details
                      </summary>
                      <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-auto">
                        {errorStack}
                      </pre>
                    </details>
                  )}
                </div>
              );
            }
            
            // Calculate panel dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const dashboardWidth = Math.max(
              Math.min(Math.round(viewportWidth * 0.7), viewportWidth - 40),
              600,
            );
            const dashboardHeight = Math.max(
              Math.min(Math.round(viewportHeight * 0.75), viewportHeight - 40),
              450,
            );
            const leftPadding = 50;
            const topPadding = 68;
            const edgePadding = 16;
            const safeWidth = Math.max(
              320,
              Math.min(
                dashboardWidth,
                viewportWidth - leftPadding - edgePadding,
              ),
            );
            const safeHeight = Math.max(
              240,
              Math.min(
                dashboardHeight,
                viewportHeight - topPadding - edgePadding,
              ),
            );
            
            // Calculate position
            const openPanelIds = Object.keys(panels).filter(
              (panelId) => !panels[panelId as PanelId]?.isMinimized,
            ) as PanelId[];
            const openPanelCount = openPanelIds.length;
            const sidebarWidth = 256;
            const defaultX = Math.min(
              sidebarWidth + 50,
              Math.max(sidebarWidth + 16, window.innerWidth - safeWidth - 32),
            );
            const cascadeY = Math.min(openPanelCount * 32, 120);
            const defaultY = Math.min(
              Math.max(70, 48 + 20) + cascadeY,
              window.innerHeight - safeHeight - edgePadding,
            );
            const maxX = Math.max(
              leftPadding,
              viewportWidth - safeWidth - edgePadding,
            );
            const maxY = Math.max(
              topPadding,
              viewportHeight - safeHeight - edgePadding,
            );
            const clampedX = Math.min(Math.max(defaultX, leftPadding), maxX);
            const clampedY = Math.min(Math.max(defaultY, topPadding), maxY);
            
            const zIndex = 20010 + nextZIndexRef.current++;
            nextZIndexRef.current++;
            
            // Create error panel in state so user can see what went wrong
            setPanels((prev) => ({
              ...prev,
              [panelKey]: {
                entry: {
                  id: panelKey,
                  title: metadata?.label || `Error Loading ${id}`,
                  panelKey: id,
                  element: (
                    <Suspense fallback={<div className="p-6">Loading error details...</div>}>
                      <ErrorComponent moduleName={id} error={err} />
                    </Suspense>
                  ),
                  defaultWidth: safeWidth,
                  defaultHeight: safeHeight,
                  icon: metadata?.icon || "⚠️",
                  isImageIcon: false,
                },
                position: { x: clampedX, y: clampedY },
                size: { width: safeWidth, height: safeHeight },
                isMinimized: false,
                isExpanded: false,
                zIndex,
                panelProps: panelProps || {},
              },
            }));
            
            pendingPanelsRef.current.delete(id);
            // Process queued panels if any
            if (openPanelQueueRef.current.length > 0 && !isProcessingQueueRef.current) {
              isProcessingQueueRef.current = true;
              const queue = [...openPanelQueueRef.current];
              openPanelQueueRef.current = [];
              queue.forEach((item, index) => {
                setTimeout(() => {
                  openPanel(item.id, item.tab, item.panelProps);
                  if (index === queue.length - 1) {
                    setTimeout(() => {
                      isProcessingQueueRef.current = false;
                    }, 100);
                  }
                }, index * 150);
              });
            }
          });

        return;
      }

      // Check if system panel (all lazy imports are now at top level)

      const systemRegistry: Record<
        string,
        {
          metadata: {
            defaultWidth: number;
            defaultHeight: number;
            icon?: string;
            title?: string;
          };
          element: ReactNode;
        }
      > = {
        zaro: {
          metadata: {
            defaultWidth: 800,
            defaultHeight: 600,
            icon: "🔐",
            title: "ZARO Guardian",
          },
          element: <ZaroPanel />,
        },
        settings: {
          metadata: {
            defaultWidth: 500,
            defaultHeight: 400,
            icon: "⚙️",
            title: "Settings",
          },
          element: <SettingsPanel />,
        },
        echo: {
          metadata: {
            defaultWidth: 800,
            defaultHeight: 600,
            icon: "🤖",
            title: "EchoCoder",
          },
          element: (
            <EchoCoderAccessGuard>
              <Suspense
                fallback={
                  <div className="p-6 text-foreground/60">
                    Loading EchoCoder…
                  </div>
                }
              >
                <EchoCoderPanel />
              </Suspense>
            </EchoCoderAccessGuard>
          ),
        },
        dashboard: {
          metadata: {
            defaultWidth: 1280,
            defaultHeight: 820,
            icon: "",
            title: "Dashboard",
          },
          element: (
            <Suspense
              fallback={
                <div className="p-6 text-foreground/60">Loading Dashboard…</div>
              }
            >
              {/* iter263.5 · admin/owner see the Daily Operations Dashboard;
                  everyone else still sees the Restaurant Dashboard. */}
              <AdminAwareDashboard />
            </Suspense>
          ),
        },
        "network-chat": {
          metadata: {
            defaultWidth: 350,
            defaultHeight: 380,
            icon: "💬",
            title: "Network Chat",
          },
          element: (
            <Suspense
              fallback={
                <div className="p-6 text-foreground/60">Loading Chat…</div>
              }
            >
              <NetworkChat />
            </Suspense>
          ),
        },
        "chat-settings": {
          metadata: {
            defaultWidth: 400,
            defaultHeight: 450,
            icon: "⚙️",
            title: "Chat Settings",
          },
          element: (
            <Suspense
              fallback={
                <div className="p-6 text-foreground/60">Loading Settings…</div>
              }
            >
              <ChatSettings />
            </Suspense>
          ),
        },
        notes: {
          metadata: {
            defaultWidth: 500,
            defaultHeight: 500,
            icon: "📝",
            title: "Sticky Notes",
          },
          element: (
            <Suspense
              fallback={
                <div className="p-6 text-foreground/60">Loading Notes…</div>
              }
            >
              <StickyNotesPanel />
            </Suspense>
          ),
        },
      };

      // Special handling for settings panel to pass the tab parameter
      let sysPanel = systemRegistry[id];
      if (id === "settings" && tab) {
        // Create a copy of the settings panel with the initial tab prop
        sysPanel = {
          ...systemRegistry[id],
          element: <SettingsPanel initialTab={tab as any} />,
        };
      }

      console.log(
        "[PanelHost] Checking system panel:",
        id,
        "found:",
        !!sysPanel,
        "with tab:",
        tab,
      );

      if (sysPanel) {
        console.log("[PanelHost] Found system panel, creating:", id);
        const zIndex = nextZIndexRef.current++;
        setPanels((prev) => {
          if (prev[id]) {
            // Panel already open - just bring to focus and unminimize
            console.log(
              "[PanelHost] Panel already exists:",
              id,
              "Current isMinimized:",
              prev[id].isMinimized,
            );
            const updatedPanel = {
              ...prev[id],
              zIndex,
              isMinimized: false,
              isExpanded: false,
            };
            // Update the element with the correct tab if this is the settings panel
            if (id === "settings" && tab && sysPanel.metadata) {
              updatedPanel.entry = {
                ...prev[id].entry,
                element: <SettingsPanel initialTab={tab as any} />,
              };
            }
            console.log(
              "[PanelHost] Panel already exists, bringing to focus and unminimizing",
            );
            pendingPanelsRef.current.delete(id);
            return {
              ...prev,
              [id]: updatedPanel,
            };
          }
          console.log("[PanelHost] Creating new system panel:", id);

          // Calculate responsive panel size based on viewport
          // 13" laptop (1440px): ~60% of width
          // 24" monitor (1920px): ~70% of width
          // 4K monitor (2560px+): ~75% of width
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Calculate width ratio based on viewport
          let widthRatio = 0.7;
          if (viewportWidth < 1024) widthRatio = 0.85;
          else if (viewportWidth < 1440) widthRatio = 0.65;
          else if (viewportWidth < 1920) widthRatio = 0.7;
          else if (viewportWidth < 2560) widthRatio = 0.75;
          else widthRatio = 0.8;

          // Calculate height ratio based on viewport
          let heightRatio = 0.75;
          if (viewportHeight < 720) heightRatio = 0.8;
          else if (viewportHeight < 1080) heightRatio = 0.7;
          else if (viewportHeight < 1440) heightRatio = 0.75;
          else heightRatio = 0.8;

          // Calculate responsive dimensions with constraints
          const dashboardWidth = Math.max(
            Math.min(
              Math.round(viewportWidth * widthRatio),
              viewportWidth - 40,
            ),
            800, // Minimum width
          );
          const dashboardHeight = Math.max(
            Math.min(
              Math.round(viewportHeight * heightRatio),
              viewportHeight - 40,
            ),
            600, // Minimum height
          );
          const leftPadding = 50;
          const topPadding = 68;
          const edgePadding = 16;
          const safeWidth = Math.max(
            320,
            Math.min(
              dashboardWidth,
              viewportWidth - leftPadding - edgePadding,
            ),
          );
          const safeHeight = Math.max(
            240,
            Math.min(
              dashboardHeight,
              viewportHeight - topPadding - edgePadding,
            ),
          );

          // Calculate cascade offset based on number of open panels
          // Use tighter spacing (28px) for better visual density and to avoid second row
          const openPanelCount = Object.keys(prev).filter(
            (panelId) => !prev[panelId as PanelId]?.isMinimized,
          ).length;
          const cascadeOffsetPerPanel = 28; // Reduced from 40 for tighter spacing
          let cascadeOffset = openPanelCount * cascadeOffsetPerPanel;

          // Calculate position with cascade
          // Start at left edge with sidebar consideration, cascade each panel right and down
          const sidebarWidth = 256;
          const minMargin = 16;
          const startX = sidebarWidth + minMargin;
          const startY = 48 + 20; // Below toolbar (48px) + padding

          // Calculate max position to keep panels on screen
          const maxX = Math.max(
            startX,
            viewportWidth - safeWidth - minMargin,
          );
          const maxY = Math.max(
            startY,
            viewportHeight - safeHeight - minMargin,
          );

          // For large panels that take up significant viewport space, reduce cascade offset
          // to prevent them from being positioned off-screen
          const panelAreaRatio =
            (safeWidth * safeHeight) /
            (viewportWidth * viewportHeight);
          if (panelAreaRatio > 0.4) {
            // Large panel (takes up >40% of viewport)
            // Reduce cascade offset to keep it visible
            cascadeOffset = Math.max(0, Math.min(cascadeOffset, 64));
          }

          let x = Math.min(startX + cascadeOffset, maxX);
          let y = Math.min(startY + cascadeOffset, maxY);

          // Ensure panel is fully visible horizontally
          // If calculated position would push panel off-screen, adjust it
          if (x + safeWidth > viewportWidth - minMargin) {
            x = Math.max(minMargin, viewportWidth - safeWidth - minMargin);
          }

          // Ensure panel is fully visible vertically
          // If calculated position would push panel off-screen, adjust it
          if (y + safeHeight > viewportHeight - minMargin) {
            y = Math.max(
              minMargin,
              viewportHeight - safeHeight - minMargin,
            );
          }

          const panelZIndex = nextZIndexRef.current++;

          return {
            ...prev,
            [id]: {
              entry: {
                id,
                title:
                  sysPanel.metadata.title ||
                  id.charAt(0).toUpperCase() + id.slice(1),
                panelKey: id,
                element: sysPanel.element,
                defaultWidth: safeWidth,
                defaultHeight: safeHeight,
                icon: sysPanel.metadata.icon || "📦",
                isImageIcon:
                  sysPanel.metadata.icon?.startsWith("http") ?? false,
              },
              position: {
                x,
                y,
              },
              size: {
                width: safeWidth,
                height: safeHeight,
              },
              isMinimized: false,
              isExpanded: false,
              zIndex: panelZIndex,
            },
          };
        });
        pendingPanelsRef.current.delete(id);
        // Process queued panels if any
        if (openPanelQueueRef.current.length > 0 && !isProcessingQueueRef.current) {
          isProcessingQueueRef.current = true;
          const queue = [...openPanelQueueRef.current];
          openPanelQueueRef.current = [];
          queue.forEach((item, index) => {
            setTimeout(() => {
              openPanel(item.id, item.tab, item.panelProps);
              if (index === queue.length - 1) {
                setTimeout(() => {
                  isProcessingQueueRef.current = false;
                }, 100);
              }
            }, index * 150);
          });
        }
      }
    } catch (error) {
      console.error("[PanelHost] Error opening panel:", error);
      isProcessingQueueRef.current = false;
      pendingPanelsRef.current.delete(id);
    }
  };

  useDiagPanelBridge(
    (panelId: string) => openPanel(panelId as PanelId),
    closeAllPanels
  );

  const onDockAction = (e: Event) => {
    const detail = (
      e as CustomEvent<{ action: string; payload?: Record<string, any> }>
    ).detail;
    if (!detail) return;

    const { action } = detail;

    // Handle echo-ai-toggle separately (no state change needed)
    if (action === "echo-ai-toggle") {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent("echo-ai-toggle"));
      });
      return;
    }

    setPanels((prev) => {
      const panelIds = Object.keys(prev) as PanelId[];
      const openPanelIds = panelIds.filter((id) => !prev[id]?.isMinimized);

      switch (action) {
        case "close-all": {
          // Close all panels (remove them from state) and dispatch restore-panel for dock cleanup
          queueMicrotask(() => {
            panelIds.forEach((id) => {
              window.dispatchEvent(
                new CustomEvent("restore-panel", { detail: { id } }),
              );
            });
          });
          return {};
        }

        case "minimize-all": {
          // Minimize all open panels to dock and dispatch panel-minimized events
          const newPanels: typeof prev = {};
          openPanelIds.forEach((id) => {
            newPanels[id] = {
              ...prev[id],
              isMinimized: true,
              isExpanded: false,
            };
          });

          // Dispatch panel-minimized events after state update
          queueMicrotask(() => {
            openPanelIds.forEach((id) => {
              const panel = prev[id];
              const metadata = PANEL_METADATA[id as PanelKey];
              const metadataIcon = metadata?.icon;
              // iter265 · Brand icon first so dock matches sidebar/panel-header
              const brand = getBrandIcon(id, panel?.entry.id, panel?.entry.icon ?? undefined);
              const icon =
                brand ||
                (metadataIcon && metadataIcon.startsWith("http")
                  ? metadataIcon
                  : undefined) ||
                panel?.entry.icon ||
                metadataIcon ||
                "📦";
              const isImageIcon =
                Boolean(brand) || (panel?.entry.isImageIcon ?? icon.startsWith("http"));

              window.dispatchEvent(
                new CustomEvent("panel-minimized", {
                  detail: {
                    id,
                    title: panel?.entry.title || "Panel",
                    icon,
                    isImageIcon,
                  },
                }),
              );
            });
          });

          return { ...prev, ...newPanels };
        }

        case "stack-grid": {
          // First un-minimize all panels, then apply grid layout
          const allPanelIds = Object.keys(prev) as PanelId[];
          const unminimizedPanels: typeof prev = {};
          const wasMinimized: Set<PanelId> = new Set();

          // Un-minimize all panels and track which were minimized
          allPanelIds.forEach((id) => {
            if (prev[id]?.isMinimized) {
              wasMinimized.add(id);
            }
            unminimizedPanels[id] = { ...prev[id], isMinimized: false };
          });

          // Now apply grid layout to all panels
          const layout = calculateGridLayout(
            allPanelIds,
            window.innerWidth,
            window.innerHeight,
            Object.fromEntries(
              allPanelIds.map((id) => [
                id,
                unminimizedPanels[id]?.size.width || 400,
              ]),
            ),
            Object.fromEntries(
              allPanelIds.map((id) => [
                id,
                unminimizedPanels[id]?.size.height || 300,
              ]),
            ),
          );

          const newPanels: typeof prev = {};
          allPanelIds.forEach((id) => {
            const pos = layout.positions[id];
            const size = layout.sizes?.[id];
            newPanels[id] = {
              ...unminimizedPanels[id],
              position: pos || unminimizedPanels[id].position,
              size: size || unminimizedPanels[id].size,
              isMinimized: false,
              isExpanded: false,
            };
          });

          // Dispatch restore-panel events for panels that were minimized
          queueMicrotask(() => {
            wasMinimized.forEach((id) => {
              window.dispatchEvent(
                new CustomEvent("restore-panel", { detail: { id } }),
              );
            });
          });

          return newPanels;
        }

        case "stack-cascade": {
          // First un-minimize all panels, then apply cascade layout
          const allPanelIds = Object.keys(prev) as PanelId[];
          const unminimizedPanels: typeof prev = {};
          const wasMinimized: Set<PanelId> = new Set();

          // Un-minimize all panels and track which were minimized
          allPanelIds.forEach((id) => {
            if (prev[id]?.isMinimized) {
              wasMinimized.add(id);
            }
            unminimizedPanels[id] = { ...prev[id], isMinimized: false };
          });

          const layout = calculateCascadeLayout(
            allPanelIds,
            window.innerWidth,
            window.innerHeight,
          );

          const newPanels: typeof prev = {};
          allPanelIds.forEach((id) => {
            const pos = layout.positions[id];
            newPanels[id] = {
              ...unminimizedPanels[id],
              position: pos || unminimizedPanels[id].position,
              isMinimized: false,
              isExpanded: false,
            };
          });

          // Dispatch restore-panel events for panels that were minimized
          queueMicrotask(() => {
            wasMinimized.forEach((id) => {
              window.dispatchEvent(
                new CustomEvent("restore-panel", { detail: { id } }),
              );
            });
          });

          return newPanels;
        }

        default:
          return prev;
      }
    });
  };

  const handleWidgetPopOut = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail || !detail.widgetId) return;

    const { widgetId, widgetName, widgetIcon } = detail;

    // Create a floating panel for the popped-out widget
    setPanels((prev) => {
      // Check if this widget is already floating
      if (prev[`popup-${widgetId}`]) {
        // Already open, just bring to front
        const zIndex = nextZIndexRef.current++;
        return {
          ...prev,
          [`popup-${widgetId}`]: {
            ...prev[`popup-${widgetId}`],
            zIndex,
            isMinimized: false,
            isExpanded: false,
          },
        };
      }

      // Use a very high z-index for popped-out widgets to ensure they appear above dashboard
      // Dashboard widgets are at z-index 30000, so we use 45000+ for popped-out panels
      const zIndex = 45000 + nextZIndexRef.current;
      nextZIndexRef.current++;

      const popupKey = `popup-${widgetId}` as PanelId;

      // Widget component map
      const widgetComponentMap: Record<string, React.ComponentType<any>> = {
        "labor-cost": LaborCostWidget,
        revenue: RevenueWidget,
        occupancy: OccupancyWidget,
        orders: OrdersWidget,
        delivery: DeliveryWidget,
        clock: ClockWidget,
        "vip-alerts": VIPAlertsWidget,
        messages: MessagesWidget,
        "schedule-connected": ScheduleConnectedWidget,
        "staff-management": StaffManagement,
        "staff-coverage": StaffCoverageContent,
        "realtime-staff-coverage": ScheduleHUDContent,
        satisfaction: SatisfactionWidget,
        "sales-trend": SalesTrendWidget,
        goals: GoalsWidget,
      };

      const WidgetComponent = widgetComponentMap[widgetId] || GenericWidget;

      return {
        ...prev,
        [popupKey]: {
          entry: {
            id: popupKey,
            title: widgetName || "Widget",
            element: <WidgetComponent />,
            defaultWidth: 500,
            defaultHeight: 400,
            icon: widgetIcon || "📊",
          },
          position: {
            x: Math.random() * 200 + 100,
            y: Math.random() * 200 + 100,
          },
          size: {
            width: 500,
            height: 400,
          },
          isMinimized: false,
          isExpanded: false,
          zIndex,
        },
      };
    });
  };

  useEffect(() => {
    const handleOpenPanel = (e: Event) => {
      const detail = (
        e as CustomEvent<{ id: string; tab?: string; [key: string]: any }>
      ).detail;
      if (detail && detail.id) {
        const { id, tab, ...panelProps } = detail;
        const resolvedId = id === "echocoder" ? "echo" : id;
        openPanel(resolvedId as PanelId, tab, panelProps);
      }
    };

    const handleEchoCoderShortcut = (event: KeyboardEvent) => {
      if (event.metaKey && event.shiftKey && event.key === "Tab") {
        echoShortcutPrimedRef.current = Date.now();
        return;
      }
      if (
        echoShortcutPrimedRef.current &&
        Date.now() - echoShortcutPrimedRef.current < 1200 &&
        event.metaKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        echoShortcutPrimedRef.current = null;
        openPanel("echo");
      }
    };

    const handleRestorePanel = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail && detail.id) {
        console.log("[PanelHost] Restoring minimized panel:", detail.id);
        setPanels((prev) => {
          const panelId = detail.id as PanelId;
          if (prev[panelId]) {
            console.log("[PanelHost] Panel exists, unminimizing:", panelId);
            const zIndex = nextZIndexRef.current++;
            return {
              ...prev,
              [panelId]: {
                ...prev[panelId],
                isMinimized: false,
                isExpanded: false,
                zIndex,
              },
            };
          } else {
            console.warn(
              "[PanelHost] Panel not found:",
              panelId,
              "Available panels:",
              Object.keys(prev),
            );
          }
          return prev;
        });
      }
    };

    const handleCreateStickyNote = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.panelId) return;

      const panelId = detail.panelId as PanelId;
      const zIndex = nextZIndexRef.current++;

      // Try to restore position from localStorage
      const savedPositions = JSON.parse(
        localStorage.getItem("sticky-notes-positions") || "{}",
      );
      const savedPosition = savedPositions[panelId as string];

      setPanels((prev) => {
        if (prev[panelId]) {
          return {
            ...prev,
            [panelId]: {
              ...prev[panelId],
              zIndex,
              isMinimized: false,
              isExpanded: false,
            },
          };
        }

        return {
          ...prev,
          [panelId]: {
            entry: {
              id: panelId,
              title: "Sticky Note",
              element: (
                <StickyNotesModule
                  panelId={panelId}
                  onDelete={() => {
                    setPanels((p) => {
                      if (!p[panelId]) {
                        console.debug(
                          "[PanelHost] Panel already deleted:",
                          panelId,
                        );
                        return p;
                      }

                      const newPanels = { ...p };
                      delete newPanels[panelId];
                      console.debug(
                        "[PanelHost] Deleted sticky note:",
                        panelId,
                      );
                      return newPanels;
                    });
                  }}
                  onResize={(newSize) => {
                    setPanels((p) => {
                      if (!p[panelId]) {
                        console.debug(
                          "[PanelHost] Panel already deleted, skipping resize:",
                          panelId,
                        );
                        return p;
                      }

                      return {
                        ...p,
                        [panelId]: {
                          ...p[panelId],
                          size: newSize,
                        },
                      };
                    });
                  }}
                />
              ),
              defaultWidth: 225,
              defaultHeight: 225,
              icon: "📝",
            },
            position: savedPosition || {
              x: Math.random() * 400 + 100,
              y: Math.random() * 300 + 100,
            },
            size: {
              width: 225,
              height: 225,
            },
            isMinimized: false,
            isExpanded: false,
            zIndex,
          },
        };
      });
    };

    const unsubOsBusOpenPanel = osBus.on(
      "ui:open_panel",
      ({ panelKey, payload }) => {
        const detail: Record<string, any> = { id: panelKey };
        if (payload && typeof payload === "object") {
          Object.assign(detail, payload as any);
        } else if (payload !== undefined) {
          detail.payload = payload;
        }

        window.dispatchEvent(new CustomEvent("open-panel", { detail }));
      },
    );

    window.addEventListener("open-panel", handleOpenPanel);
    window.addEventListener("restore-panel", handleRestorePanel);
    // Close-panel listener: allows dashboard KPI drill-down navigation
    const handleClosePanel = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string };
      const key = detail?.id as PanelId | undefined;
      console.debug("[PanelHost] close-panel received:", key);
      if (!key) return;
      setPanels((prev) => {
        console.debug("[PanelHost] Current panels:", Object.keys(prev));
        if (!prev[key]) {
          console.debug("[PanelHost] Panel not found:", key);
          return prev;
        }
        const next = { ...prev };
        delete next[key];
        console.debug("[PanelHost] Panel closed:", key, "Remaining:", Object.keys(next));
        return next;
      });
    };
    window.addEventListener("close-panel", handleClosePanel);

    // iter177 · tile all open panels side-by-side, filling the available area
    const handleTileAll = () => {
      setPanels((prev) => {
        const open = Object.entries(prev).filter(([_, p]) => p && !p.isMinimized);
        const n = open.length;
        if (n === 0) return prev;
        // Available viewport (account for sidebar ~220px on lg and top bars ~90px)
        const sidebarW = window.innerWidth >= 1024 ? 220 : 0;
        const topOffset = 90;
        const availW = Math.max(600, window.innerWidth - sidebarW - 24);
        const availH = Math.max(500, window.innerHeight - topOffset - 40);
        // Grid cols: 1 → 1, 2 → 2, 3 → 3, 4 → 2x2, 5-6 → 3x2, 7-9 → 3x3, 10+ → 4 cols
        const cols = n <= 3 ? n : n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4;
        const rows = Math.ceil(n / cols);
        const cellW = Math.floor(availW / cols) - 10;
        const cellH = Math.floor(availH / rows) - 10;
        const next = { ...prev };
        open.forEach(([id, p], i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          next[id as PanelId] = {
            ...p,
            isExpanded: false,
            isMinimized: false,
            position: { x: sidebarW + 12 + c * (cellW + 10), y: topOffset + r * (cellH + 10) },
            size: { width: cellW, height: cellH },
          };
        });
        return next;
      });
    };
    window.addEventListener("echo:panels:tileAll", handleTileAll as EventListener);

    // iter177 · cascade all panels (stagger)
    const handleCascadeAll = () => {
      setPanels((prev) => {
        const open = Object.entries(prev).filter(([_, p]) => p && !p.isMinimized);
        const next = { ...prev };
        const sidebarW = window.innerWidth >= 1024 ? 220 : 0;
        open.forEach(([id, p], i) => {
          next[id as PanelId] = {
            ...p,
            isExpanded: false, isMinimized: false,
            position: { x: sidebarW + 40 + i * 36, y: 100 + i * 30 },
            size: { width: Math.min(1100, window.innerWidth - sidebarW - 100), height: Math.min(720, window.innerHeight - 180) },
          };
        });
        return next;
      });
    };
    window.addEventListener("echo:panels:cascadeAll", handleCascadeAll as EventListener);
    const handlePanelReloadRequested = (e: Event) => {
      const detail = (e as CustomEvent).detail as { panelKey?: string };
      const key = detail?.panelKey as PanelId | undefined;
      if (!key) return;
      setPanels((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTimeout(() => openPanel(key), 100);
    };
    window.addEventListener("panel-reload-requested", handlePanelReloadRequested);
    window.addEventListener("dock-action", onDockAction);
    window.addEventListener("widget-pop-out", handleWidgetPopOut);
    window.addEventListener("create-sticky-note", handleCreateStickyNote);
    window.addEventListener("keydown", handleEchoCoderShortcut);

    return () => {
      unsubOsBusOpenPanel();
      window.removeEventListener("open-panel", handleOpenPanel);
      window.removeEventListener("close-panel", handleClosePanel);
      window.removeEventListener("restore-panel", handleRestorePanel);
      window.removeEventListener("echo:panels:tileAll", handleTileAll as EventListener);
      window.removeEventListener("echo:panels:cascadeAll", handleCascadeAll as EventListener);
      window.removeEventListener("panel-reload-requested", handlePanelReloadRequested);
      window.removeEventListener("dock-action", onDockAction);
      window.removeEventListener("widget-pop-out", handleWidgetPopOut);
      window.removeEventListener("create-sticky-note", handleCreateStickyNote);
      window.removeEventListener("keydown", handleEchoCoderShortcut);
    };
  }, [openPanel, onDockAction, handleWidgetPopOut]);

  if (!hostRef.current) return null;

  // Only render non-minimized panels in the floating area
  // Filter out panels with missing state or entry
  const openPanels = Object.entries(panels).filter(
    ([_, panelState]) =>
      panelState && panelState.entry && !panelState.isMinimized,
  );

  // Find the maximum z-index among open panels (default to 20009 if none are open)
  const maxZIndex =
    openPanels.length > 0
      ? Math.max(...openPanels.map(([_, ps]) => ps.zIndex), 20009)
      : 20009;

  // Always render the portal to avoid mounting/unmounting issues
  // Always render panels array (empty when no panels open) to maintain stable DOM structure
  return createPortal(
    <div>
      {openPanels.map(([panelId, panelState]) => (
        <Panel
          key={panelId}
          panelState={panelState}
          isFocused={panelState.zIndex === maxZIndex}
          onClose={() => {
            try {
              osBus.emit("audit:entry", {
                entry: { type: "panel_close", panelId, timestamp: Date.now() },
                source: "PanelHost",
              });
            } catch (_) {}
            // Record panel close for persistence
            try {
              recordPanelClose(panelId, panelState?.entry?.panelKey);
            } catch (err) {
              console.warn("[PanelHost] Failed to record panel close:", err);
            }
            setPanels((prev) => {
              const newPanels = { ...prev };
              delete newPanels[panelId as PanelId];
              return newPanels;
            });
          }}
          onMinimize={() => {
            const currentPanel = panels[panelId as PanelId];
            if (!currentPanel) return;

            const isCurrentlyMinimized = currentPanel.isMinimized;
            const newMinimizedState = !isCurrentlyMinimized;
            const metadata = PANEL_METADATA[panelId as PanelKey];
            const panelEntry = currentPanel.entry;
            const metadataIcon = metadata?.icon;
            // iter265 · Brand icon first so dock matches sidebar/panel-header
            const brand = getBrandIcon(panelId as string, panelEntry?.id, panelEntry?.icon ?? undefined);
            const icon =
              brand ||
              (metadataIcon && metadataIcon.startsWith("http")
                ? metadataIcon
                : undefined) ||
              panelEntry?.icon ||
              metadataIcon ||
              "📦";
            const isImageIcon =
              Boolean(brand) || (panelEntry?.isImageIcon ?? icon.startsWith("http"));

            // Update state first
            setPanels((prev) => {
              const panelKey = panelId as PanelId;
              const isStickyNote = (panelId as string).startsWith(
                "sticky-note-",
              );

              return {
                ...prev,
                [panelKey]: {
                  ...prev[panelKey],
                  isMinimized: newMinimizedState,
                  // For sticky notes, resize to 75x75 when minimized, 225x225 when expanded
                  ...(isStickyNote && {
                    size: newMinimizedState
                      ? { width: 75, height: 75 }
                      : { width: 225, height: 225 },
                  }),
                },
              };
            });

            // Dispatch event after state update using microtask
            queueMicrotask(() => {
              if (newMinimizedState) {
                window.dispatchEvent(
                  new CustomEvent("panel-minimized", {
                    detail: {
                      id: panelId,
                      title: panelState.entry.title,
                      icon,
                      isImageIcon,
                    },
                  }),
                );
              } else {
                window.dispatchEvent(
                  new CustomEvent("restore-panel", {
                    detail: { id: panelId },
                  }),
                );
              }
            });
          }}
          onFocus={() => {
            const newZIndex = nextZIndexRef.current++;
            setPanels((prev) => ({
              ...prev,
              [panelId]: {
                ...prev[panelId as PanelId],
                zIndex: newZIndex,
              },
            }));
          }}
          onResize={(newSize) => {
            setPanels((prev) => {
              const newPanels = {
                ...prev,
                [panelId]: {
                  ...prev[panelId as PanelId],
                  size: newSize,
                },
              };
              // Persist the new size
              try {
                const currentPosition = prev[panelId as PanelId]?.position || { x: 0, y: 0 };
                savePanelLayout(panelId, currentPosition, newSize);
              } catch (err) {
                console.warn("[PanelHost] Failed to persist panel size:", err);
              }
              return newPanels;
            });
          }}
          onPositionChange={(newPosition) => {
            setPanels((prev) => {
              const newPanels = {
                ...prev,
                [panelId]: {
                  ...prev[panelId as PanelId],
                  position: newPosition,
                },
              };

              // Persist position changes
              try {
                const currentSize = prev[panelId as PanelId]?.size || { width: 400, height: 600 };
                savePanelLayout(panelId, newPosition, currentSize);
              } catch (err) {
                console.warn("[PanelHost] Failed to persist panel position:", err);
              }

              // Also persist sticky note positions to legacy location for backwards compatibility
              if ((panelId as string).startsWith("sticky-note-")) {
                const stickyNotePositions = JSON.parse(
                  localStorage.getItem("sticky-notes-positions") || "{}",
                );
                stickyNotePositions[panelId as string] = newPosition;
                localStorage.setItem(
                  "sticky-notes-positions",
                  JSON.stringify(stickyNotePositions),
                );
              }

              return newPanels;
            });
          }}
          onToggleExpand={() => {
            setPanels((prev) => {
              const currentPanel = prev[panelId as PanelId];
              if (!currentPanel) return prev;

              const isCurrentlyExpanded = currentPanel.isExpanded;

              if (isCurrentlyExpanded) {
                // Restore to previous size and position
                return {
                  ...prev,
                  [panelId]: {
                    ...currentPanel,
                    isExpanded: false,
                    position:
                      currentPanel.preExpandedPosition || currentPanel.position,
                    size: currentPanel.preExpandedSize || currentPanel.size,
                  },
                };
              } else {
                // Save current state and expand
                const leftPadding = 50;
                const topPadding = 15;
                const edgePadding = 15;
                const expandedWidth =
                  window.innerWidth - leftPadding - edgePadding;
                const expandedHeight =
                  window.innerHeight - topPadding - edgePadding;
                const expandedX = leftPadding;
                const expandedY = topPadding;

                return {
                  ...Object.entries(prev).reduce(
                    (acc, [id, panel]) => {
                      if (id === panelId) {
                        acc[id] = {
                          ...panel,
                          isExpanded: true,
                          preExpandedSize: panel.size,
                          preExpandedPosition: panel.position,
                          size: {
                            width: expandedWidth,
                            height: expandedHeight,
                          },
                          position: { x: expandedX, y: expandedY },
                          isMinimized: false,
                        };
                      } else {
                        acc[id] = panel;
                      }
                      return acc;
                    },
                    {} as typeof prev,
                  ),
                };
              }
            });
          }}
        />
      ))}
    </div>,
    hostRef.current,
  );
}

export default PanelHost;
