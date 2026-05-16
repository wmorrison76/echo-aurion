import React, { Suspense, useEffect } from "react";
import "./global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useInRouterContext,
} from "react-router-dom";
import type { ComponentType } from "react";
import { ThemeProvider } from "next-themes";
import { AurionThemeProvider, useThemeTokens } from "@/styles/design-tokens";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthProvider as JwtAuthProvider, useAuth as useJwtAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

// Echo System Test Data - Available in browser console as window.__echoTest
if (typeof window !== "undefined" && import.meta.env.DEV) {
  import("@/lib/echo-test-data").then(m => m.initializeTestData()).catch(() => {});
}

function CenterMessage({ title }: { title: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#334155",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            margin: "0 auto 12px",
            width: 40,
            height: 40,
            borderRadius: 9999,
            border: "4px solid #e2e8f0",
            borderTopColor: "#2563eb",
            animation: "spin 1s linear infinite",
          }}
        />
        <div>{title}</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function AppSuspenseFallback() {
  return <CenterMessage title="Starting…" />;
}

const LazyTranslationInterceptor = React.lazy(async () => {
  // TEMPORARILY DISABLED: Causes DOM manipulation conflicts with React reconciliation
  return { default: () => null };
});

/**
 * Enhanced lazy loader that handles errors gracefully
 */
function safeLazy(importFn: () => Promise<{ default: ComponentType<unknown> }>, name: string) {
  return React.lazy(async () => {
    try {
      const mod = await importFn();
      if (!mod || !mod.default) {
        console.warn(`[Lazy] Module ${name} missing default export`);
        return { default: () => <div className="p-4 text-sm text-muted-foreground">Component {name} unavailable</div> };
      }
      return mod;
    } catch (err) {
      console.error(`[Lazy] Failed to load ${name}:`, err);
      return { default: () => <div className="p-4 text-sm text-red-500">Error loading {name}</div> };
    }
  });
}

const LazyUnifiedToolbar = safeLazy(
  () => import("@/components/site/UnifiedToolbar"),
  "UnifiedToolbar",
);
const LazySidebar = safeLazy(() => import("@/components/site/Sidebar"), "Sidebar");
const LazyPanelLayoutToolbar = safeLazy(() => import("@/components/site/PanelLayoutToolbar").then(m => ({ default: m.PanelLayoutToolbar })), "PanelLayoutToolbar");
const LazyGoogleAuthPill = safeLazy(() => import("@/components/site/GoogleAuthPill").then(m => ({ default: m.GoogleAuthPill })), "GoogleAuthPill");
const LazyEchoConciergeMobile = safeLazy(() => import("@/modules/EchoConciergeMobile"), "EchoConciergeMobile");
const LazySharedBoard = safeLazy(() => import("@/modules/SharedBoard"), "SharedBoard");
const LazyGuestLanding = safeLazy(() => import("@/modules/GuestConcierge"), "GuestLanding");
const LazyGuestApp = safeLazy(() => import("@/modules/GuestConcierge").then(m => ({ default: m.GuestApp })), "GuestApp");
const LazyDailyBriefingMobile = safeLazy(() => import("@/modules/DailyBriefingMobile"), "DailyBriefingMobile");
const LazyGroupEventAttendee = safeLazy(() => import("@/modules/GroupEventAttendee"), "GroupEventAttendee");
const LazyStaffMobile = safeLazy(() => import("@/modules/StaffMobile"), "StaffMobile");
const LazyWasteStandalone = safeLazy(() => import("@/modules/StaffMobile/WasteStandalone"), "WasteStandalone");
const LazyEcwOpsStandalone = safeLazy(() => import("@/modules/StaffMobile/EcwOpsStandalone"), "EcwOpsStandalone");
const LazyMyEcho = safeLazy(() => import("@/modules/StaffMobile/MyEcho"), "MyEcho");
const LazyInstallHub = safeLazy(() => import("@/modules/InstallHub"), "InstallHub");
const LazyLoginPage = safeLazy(() => import("@/modules/Auth/LoginPage"), "LoginPage");
const LazyResetPassword = safeLazy(() => import("@/modules/Auth/ResetPasswordPage"), "ResetPasswordPage");
const LazyUserAvatarMenu = safeLazy(() => import("@/components/site/UserAvatarMenu"), "UserAvatarMenu");
const LazyHelpDesk = safeLazy(() => import("@/components/site/HelpDesk"), "HelpDesk");
const LazyEchoHelpMascot = safeLazy(() => import("@/components/site/EchoHelpMascot"), "EchoHelpMascot");
const LazyThemeToggle = safeLazy(() => import("@/components/site/ThemeToggle"), "ThemeToggle");
const LazyApprovalBanner = safeLazy(() => import("@/components/site/ApprovalBanner"), "ApprovalBanner");
const LazyFloorStation = safeLazy(() => import("@/modules/FloorStation"), "FloorStation");
const LazyDriverRoute = safeLazy(() => import("@/modules/DriverRoute"), "DriverRoute");
const LazyGuideOverlay = safeLazy(
  () => import("@/components/echo/GuideOverlay"),
  "GuideOverlay",
);
const LazyPanelHostIntegrated = safeLazy(
  () => import("@/components/site/PanelHostIntegrated"),
  "PanelHostIntegrated",
);
const LazyMinimizedPanelDock = safeLazy(
  () => import("@/components/site/MinimizedPanelDock"),
  "MinimizedPanelDock",
);
const LazyDesktopTaskbar = safeLazy(
  () => import("@/components/site/DesktopTaskbar").then(m => ({ default: m.DesktopTaskbar })),
  "DesktopTaskbar",
);
const LazyPWAInstallPrompt = safeLazy(
  () => import("@/components/site/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })),
  "PWAInstallPrompt",
);
const LazyDegradedModeBanner = safeLazy(
  () => import("@/components/site/DegradedModeBanner"),
  "DegradedModeBanner",
);
const LazyProductionReminderBanner = safeLazy(
  () => import("@/components/dashboard/ProductionReminderBanner"),
  "ProductionReminderBanner",
);
const LazyPublicBookingPage = safeLazy(
  () => import("@/pages/PublicBookingPage"),
  "PublicBookingPage",
);
const LazyThemeLintOverlay = safeLazy(() => import("@/dev/ThemeLintOverlay"), "ThemeLintOverlay");
const LazyEchoAiLauncher = safeLazy(
  () => import("@/components/site/EchoAiLauncher"),
  "EchoAiLauncher",
);
// iter263.3 · Echo AI³ floating orb (right-edge drawer with expand + live activity)
const LazyEchoAI3Enhanced = safeLazy(
  () => import("@/components/site/EchoAI3Enhanced").then(m => ({ default: m.EchoAI3Enhanced })),
  "EchoAI3Enhanced",
);
// iter263.4 · Public guest pages (no auth): /ird/:slug · /spa/:slug
const LazyPublicIRD = safeLazy(
  () => import("@/pages/PublicGuestPage").then(m => ({ default: () => React.createElement(m.default as any, { kind: "ird" }) })),
  "PublicIRD",
);
const LazyPublicSpa = safeLazy(
  () => import("@/pages/PublicGuestPage").then(m => ({ default: () => React.createElement(m.default as any, { kind: "spa" }) })),
  "PublicSpa",
);
const LazySystemSettings = safeLazy(
  () => import("@/components/site/SystemSettings"),
  "SystemSettings",
);
const LazyIntegrationPanelManager = safeLazy(
  () => import("@/components/integrations/IntegrationPanelManager"),
  "IntegrationPanelManager",
);
const LazyIntegrationAuthHandler = safeLazy(
  () => import("@/components/integrations/IntegrationAuthHandler"),
  "IntegrationAuthHandler",
);
const LazyEchoMissionOverlay = safeLazy(
  () => import("@/components/EchoMissionOverlay"),
  "EchoMissionOverlay",
);

const LazyModulePanelPage = safeLazy(() => import("@/pages/ModulePanelPage"), "ModulePanelPage");
const LazyDebugCulinaryPage = safeLazy(() => import("@/pages/DebugCulinaryPage"), "DebugCulinaryPage");
const LazyDebugCulinary2Page = safeLazy(() => import("@/pages/DebugCulinary2Page"), "DebugCulinary2Page");
const LazyModuleDiagnostic = safeLazy(() => import("@/pages/ModuleDiagnostic"), "ModuleDiagnostic");
const LazyDiagRunnerPage = safeLazy(() => import("@/pages/DiagRunnerPage"), "DiagRunnerPage");
const LazyAuthPage = safeLazy(() => import("@/pages/AuthPage"), "AuthPage");
const LazyGuestJoinPage = safeLazy(() => import("@/pages/GuestJoinPage"), "GuestJoinPage");

const LazyAppMobile = safeLazy(() => import("@/mobile/AppMobile"), "AppMobile");
const LazyMobileReceiving = safeLazy(
  () => import("@/mobile/pages/MobileReceiving"),
  "MobileReceiving",
);
const LazyMobileInventoryCount = safeLazy(
  () => import("@/mobile/pages/MobileInventoryCount"),
  "MobileInventoryCount",
);
const LazyMobileRecipeView = safeLazy(
  () => import("@/mobile/pages/MobileRecipeView"),
  "MobileRecipeView",
);
const LazyMobileApprovals = safeLazy(
  () => import("@/mobile/pages/MobileApprovals"),
  "MobileApprovals",
);
const LazyMobileTasks = safeLazy(() => import("@/mobile/pages/MobileTasks"), "MobileTasks");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MaybeRouter({ children }: { children: React.ReactNode }) {
  const inCtx = useInRouterContext();
  return inCtx ? <>{children}</> : <BrowserRouter>{children}</BrowserRouter>;
}

function DesktopShell() {
  // iter258 · Role-aware Pastry banner gating. Auto-open of role landing
  // happens in PanelHostIntegrated (not here) so panels persist correctly.
  const { user } = useJwtAuth();
  const role = (user?.role || "").toLowerCase();
  // iter261 · Apply backdrop image from current theme tokens.
  const themeTokens = useThemeTokens();

  // iter263 · Pastry production reminder banner is ONLY for roles that touch
  // pastry production directly. Previously admin/owner saw this even though
  // they aren't pastry roles — confusing. Tightened to pastry-first roles.
  // iter266 · Tightened further per William: Chef Gio is Banquets (exec-chef
  // role) and was incorrectly seeing the Pastry-Cake-Production banner. Each
  // banner now gates on the actual department/discipline, not a broad role.
  const PASTRY_BANNER_ROLES = new Set([
    "pastry-chef",
    "pastry-sous-chef",
    "pastry-cook",
  ]);
  const department = (user?.department || "").toLowerCase();
  const isPastryDept = department.includes("pastry") || department.includes("patisserie") || department.includes("bakery");
  const showPastryBanner = PASTRY_BANNER_ROLES.has(role) || isPastryDept;

  return (
    <>
      <Suspense fallback={null}>
        <LazyIntegrationPanelManager />
      </Suspense>
      <Suspense fallback={null}>
        <LazyIntegrationAuthHandler />
      </Suspense>

      <Suspense fallback={null}>
        <LazyUnifiedToolbar />
      </Suspense>
      {/* iter164: EchoAiLauncher orb deprecated in favor of EchoCommandBar (App.tsx root).
          Kept import tree-shakable by not mounting. */}
      <Suspense fallback={null}>
        <LazySystemSettings />
      </Suspense>
      <Suspense fallback={null}>
        <LazySidebar />
      </Suspense>
      {/* iter252 · PanelLayoutToolbar (Tile+Cascade) removed per William — Dock is the canonical layout switcher.
      <Suspense fallback={null}>
        <LazyPanelLayoutToolbar />
      </Suspense> */}
      {/* iter252 · GoogleAuthPill removed — JWT auth (UserAvatarMenu) is now primary.
          Re-enable only if Google SSO is needed alongside JWT. */}
      <Suspense fallback={null}>
        <LazyUserAvatarMenu />
      </Suspense>
      {/* iter263 · Global dark/light toggle — matched to avatar row (top:14). */}
      <div style={{ position: "fixed", top: 22, right: 230, zIndex: 2147483647 }}>
        <Suspense fallback={null}>
          <LazyThemeToggle compact />
        </Suspense>
      </div>
      {/* iter264 · HelpDesk (lightbulb) recovered into the LUCCCA shell
          (previously orphaned — only the EchoCoder Header used to mount it).
          iter266 · Removed per William — its functions (guided steps,
          docs index, "Ask Echo") are now delivered by the EchoHelpMascot,
          which sits in this slot at top:24, right:270. */}
      <Suspense fallback={null}>
        <LazyApprovalBanner />
      </Suspense>
      {/* iter263.3 · Echo AI³ floating orb at bottom-right with expandable drawer
          (chat + live event_bus activity stream + system awareness panel). */}
      <Suspense fallback={null}>
        <LazyEchoAI3Enhanced />
      </Suspense>

      <div style={{
        minHeight: "100vh",
        backgroundImage: `url(${themeTokens.backdropUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}>
        {showPastryBanner && (
          <Suspense fallback={null}>
            <LazyProductionReminderBanner />
          </Suspense>
        )}
        <Suspense fallback={<CenterMessage title="Loading…" />}>
          <Outlet />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <LazyGuideOverlay />
      </Suspense>
      {/* D63/D64 · Echo Help Mascot — corner-parked LUCCCA astronaut.
          Backend: routes/help_agent.py. Spec: docs/UX_ICON_SYSTEM.md. */}
      <Suspense fallback={null}>
        <LazyEchoHelpMascot />
      </Suspense>
      <Suspense fallback={null}>
        <LazyEchoMissionOverlay />
      </Suspense>
      <Suspense fallback={null}>
        <LazyPanelHostIntegrated />
      </Suspense>
      <Suspense fallback={null}>
        <LazyMinimizedPanelDock />
      </Suspense>
      <Suspense fallback={null}>
        {/* iter266 · DesktopTaskbar (clock/time chip) removed per William —
            cluttered the top-right band. Date/time now lives inside MyEcho
            and the calendar panels where it's actually actionable. */}
        <LazyPWAInstallPrompt />
      </Suspense>
      <Suspense fallback={null}>
        <LazyDegradedModeBanner />
      </Suspense>
      {import.meta.env.DEV ? (
        <Suspense fallback={null}>
          <LazyThemeLintOverlay />
        </Suspense>
      ) : null}
    </>
  );
}

function DeferredDesktopShell() {
  return (
    <Suspense fallback={<CenterMessage title="Loading UI…" />}>
      <DesktopShell />
    </Suspense>
  );
}

function AppContent() {
  const authContext = useAuth();

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const isLoading = authContext?.isLoading ?? true;

  // Lightweight, non-blocking boot: everything here is best-effort and deferred.
  // CRITICAL: This MUST NOT block the critical rendering path
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const safe = async (label: string, fn: () => Promise<void>) => {
        try {
          await fn();
        } catch (err) {
          console.debug(`[APP] ${label} skipped (non-critical):`, err);
        }
      };

      // Defer a bit so the initial UI can paint.
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled) return;

      // PHASE 1: Critical initialization (must be fast, <50ms combined)
      // Only theme initialization is truly critical for rendering
      // Everything else defers to background phases
      await safe("theme-init", async () => {
        const mod = await import("@/lib/theme-manager");
        mod.initializeTheme();
      });

      // Start sentry in background (non-blocking)
      void safe("sentry-init", async () => {
        const mod = await import("@/lib/sentry-init");
        mod.initSentry({
          enabled: true,
          tracesSampleRate: import.meta.env.MODE === "production" ? 0.05 : 0.1,
        });
        mod.addBreadcrumb?.("App initialization started", "app", "info");
      });

      // PHASE 2: Non-blocking background initialization (happens in parallel via setTimeout)
      // These don't need to await before rendering
      if (!cancelled) {
        setTimeout(() => {
          void safe("keyboard-shortcuts", async () => {
            const mod = await import("@/lib/keyboard-shortcuts");
            mod.initializeDefaultShortcuts?.();
          });

          void safe("panel-preload", async () => {
            const mod = await import("@/lib/panel-registry");
            mod.preloadCriticalModules?.();
          });

          void safe("service-worker", async () => {
            const mod = await import("@/lib/service-worker-registry");
            await mod.registerPanelServiceWorker?.();
          });

          void safe("inventory-leaderboard", async () => {
            const mod = await import("@/lib/inventory-leaderboard-wiring");
            mod.ensureInventoryLeaderboardWiring?.();
          });
        }, 50);
      }

      // PHASE 3: Heavy initialization (deferred much further, >1 second)
      if (!cancelled) {
        setTimeout(() => {
          void safe("beverage-intelligence", async () => {
            const mod = await import("@/lib/beverage-intelligence-init");
            mod.initializeBeverageIntelligence?.();
          });

          void safe("telemetry-init", async () => {
            const { initializeTelemetry } = await import("@/lib/telemetry-aggregator");
            initializeTelemetry();
          });

          void safe("startup-diagnostics", async () => {
            const { startupDiagnostics } = await import("@/lib/startup-diagnostics");
            startupDiagnostics.startSession();

            // Send diagnostics after a delay to gather data
            // Use void to ignore any errors - this is completely non-critical
            setTimeout(() => {
              void startupDiagnostics.sendDiagnosticsToServer();
            }, 10000); // 10 seconds after startup
          });
        }, 1200);
      }

      // PHASE 4: Module validation (deferred to 3+ seconds, non-critical)
      if (!cancelled) {
        setTimeout(() => {
          void safe("module-validation", async () => {
            const mod = await import("@/lib/module-validator");
            const result = await mod.getModuleHealth();
            mod.logValidationResults?.(result);
          });
        }, 3000);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const mod = await import("@/lib/theme-manager");
          await mod.syncThemePreferencesFromBackend?.();
        } catch (err) {
          console.debug("[APP] Theme sync skipped (non-critical):", err);
        }
      })();
    }, 200);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Handle shared panel links (?share=...)
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const shareParam = params.get("share");
      if (shareParam) {
        const decoded = JSON.parse(atob(shareParam));
        if (decoded.panels && Array.isArray(decoded.panels)) {
          // Open each shared panel with a small delay
          decoded.panels.forEach((panelId: string, i: number) => {
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("open-panel", { detail: { id: panelId } })
              );
            }, 500 + i * 300);
          });
          // Clean the URL
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    } catch (err) {
      console.debug("[APP] Share link parse failed:", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let tickInterval: number | undefined;
    let failedQueueInterval: number | undefined;
    let financialObserver: { destroy?: () => void } | undefined;

    const start = async () => {
      try {
        const echoMod = await import("@shared/echo/echo-ai4-core-v5");
        const observerMod =
          await import("@/lib/financial-observers/echo-ai-financial-observer");
        const glMod = await import("@/lib/financial-observers/gl-auto-poster");

        if (typeof echoMod.EchoV5?.tick === "function") {
          tickInterval = window.setInterval(() => {
            try {
              echoMod.EchoV5.tick();
              const actions = echoMod.drainActionQueue?.() ?? [];
              if (actions.length > 0) {
                console.debug(
                  `[EchoV5] Drained ${actions.length} actions from queue`,
                );
              }
            } catch (err) {
              console.error("[EchoV5 Tick Error]", err);
            }
          }, 1000);

          console.log("[EchoV5] Autonomous tick loop started");
        }

        try {
          observerMod.echoAIFinancialObserver?.initialize?.();
          financialObserver = observerMod.echoAIFinancialObserver;
          console.log("[Phase2] ✓ Financial observer wired to event bus");
        } catch (err) {
          console.error(
            "[Phase2] Financial observer initialization error:",
            err,
          );
        }

        failedQueueInterval = window.setInterval(() => {
          try {
            glMod.glAutoPostingService
              ?.processFailedQueue?.()
              .catch((err: unknown) => {
                console.error("[GLPoster] Error processing failed queue:", err);
              });
          } catch (err) {
            console.error("[GLPoster] Failed queue processor error:", err);
          }
        }, 30000);
      } catch (err) {
        console.debug(
          "[APP] Echo/financial observers skipped (non-critical):",
          err,
        );
      }
    };

    void start();

    return () => {
      if (tickInterval) window.clearInterval(tickInterval);
      if (failedQueueInterval) window.clearInterval(failedQueueInterval);
      try {
        financialObserver?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return <CenterMessage title="Loading…" />;
  }

  return (
    <Suspense fallback={<AppSuspenseFallback />}>
      <Routes>
        {/* iter177 · Google OAuth callback: the hash `#session_id=…` needs to
            reach the GoogleAuthPill which lives inside DesktopShell. Redirect
            to `/` preserving the hash so the pill exchanges + cleans. */}
        <Route path="/auth/callback" element={<GoogleAuthCallbackForward />} />
        <Route path="/auth/*" element={<LazyAuthPage />} />
        <Route path="/m/concierge/:token" element={<LazyEchoConciergeMobile />} />
        <Route path="/board/:share_id" element={<LazySharedBoard />} />
        <Route path="/guest" element={<LazyGuestLanding />} />
        <Route path="/guest/app" element={<LazyGuestApp />} />
        <Route path="/m/briefing/:token" element={<LazyDailyBriefingMobile />} />
        <Route path="/m/staff/:token" element={<LazyStaffMobile />} />
        <Route path="/m/waste" element={<LazyWasteStandalone />} />
        <Route path="/m/waste/:token" element={<LazyWasteStandalone />} />
        <Route path="/m/ecw" element={<LazyEcwOpsStandalone />} />
        <Route path="/m/ecw/:token" element={<LazyEcwOpsStandalone />} />
        <Route path="/m/me" element={<LazyMyEcho />} />
        <Route path="/m/login" element={<LazyLoginPage />} />
        <Route path="/login" element={<LazyLoginPage />} />
        <Route path="/reset-password" element={<LazyResetPassword />} />
        <Route path="/install" element={<LazyInstallHub />} />
        <Route path="/floor/:token" element={<LazyFloorStation />} />
        <Route path="/route/:token" element={<LazyDriverRoute />} />
        <Route path="/g/event/:code" element={<LazyGroupEventAttendee />} />
        <Route path="/book/:hotelSlug" element={<LazyPublicBookingPage />} />
        {/* iter263.4 · Guest-facing public ordering / booking pages (no auth) */}
        <Route path="/ird/:slug" element={<LazyPublicIRD />} />
        <Route path="/ird" element={<LazyPublicIRD />} />
        <Route path="/spa/:slug" element={<LazyPublicSpa />} />
        <Route path="/spa" element={<LazyPublicSpa />} />
        <Route
          path="/conference/join/:linkId"
          element={<LazyGuestJoinPage />}
        />

        <Route
          path="/debug/culinary"
          element={
            <ProtectedRoute>
              <LazyDebugCulinaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug/culinary2"
          element={
            <ProtectedRoute>
              <LazyDebugCulinary2Page />
            </ProtectedRoute>
          }
        />
        <Route path="/diagnostic" element={<LazyModuleDiagnostic />} />
        <Route path="/__diag" element={<LazyDiagRunnerPage />} />

        <Route
          path="/mobile"
          element={
            <ProtectedRoute>
              <LazyAppMobile />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="receiving" replace />} />
          <Route path="receiving" element={<LazyMobileReceiving />} />
          <Route
            path="inventory-count"
            element={<LazyMobileInventoryCount />}
          />
          <Route path="recipe-view" element={<LazyMobileRecipeView />} />
          <Route path="approvals" element={<LazyMobileApprovals />} />
          <Route path="tasks" element={<LazyMobileTasks />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DeferredDesktopShell />
            </ProtectedRoute>
          }
        >
          <Route index element={null} />
          <Route path="panel/:panelId/*" element={<LazyModulePanelPage />} />
        </Route>
        <Route path="/schedule" element={<Navigate to="/panel/schedule" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function AppFull() {
  useEffect(() => {
    try {
      const bootWindow = globalThis as typeof globalThis & {
        __APP_BOOT_STATUS__?: string;
        __APP_BOOT__?: { setStatus?: (status: string) => void };
      };
      bootWindow.__APP_BOOT_STATUS__ = "app-full-rendered";
      bootWindow.__APP_BOOT__?.setStatus?.("app-full-rendered");
    } catch {
      // ignore
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MaybeRouter>
          <AuthProvider>
            <JwtAuthProvider>
            <I18nProvider>
              <Suspense fallback={null}>
                <LazyTranslationInterceptor />
              </Suspense>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                <AurionThemeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <AppContent />
                </TooltipProvider>
                </AurionThemeProvider>
              </ThemeProvider>
            </I18nProvider>
            </JwtAuthProvider>
          </AuthProvider>
        </MaybeRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// iter177 · OAuth callback forwarder
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS — THIS BREAKS THE AUTH.
function GoogleAuthCallbackForward() {
  React.useEffect(() => {
    try {
      const hash = window.location.hash || "";
      // Forward to `/` but KEEP the hash so GoogleAuthPill (mounted on `/`) can exchange it.
      window.location.replace(window.location.origin + "/" + hash);
    } catch {
      window.location.replace(window.location.origin + "/");
    }
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#04060d", color: "#c8a97e", fontFamily: "system-ui" }}>
      Signing you in…
    </div>
  );
}

