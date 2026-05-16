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
import ThemeToggle from "./ThemeToggle";
import LanguageSelect from "./LanguageSelect";
import AvatarSelector from "./AvatarSelector";
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
const WhiteboardModule = lazy(() => import("@/modules/Whiteboard"));
const StickyNotesModule = lazy(() => import("@/modules/StickyNotes"));
const StickyNotesPanel = lazy(() => import("@/components/site/StickyNotes"));
const NetworkChat = lazy(() => import("@/components/site/NetworkChat"));
const ChatSettings = lazy(() => import("@/components/site/ChatSettings"));

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
    console.error(`[PanelHost] Panel "${this.props.panelTitle}" (${this.props.panelKey}) threw during render:`, error, info.componentStack);
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

type PanelId =
  | PanelKey
  | "zaro"
  | "echo"
  | "settings"
  | "dashboard"
  | (string & {});

type OpenDetail = { id: PanelId };

interface PanelEntry {
  id: PanelId;
  title: string;
  panelKey?: string; // For i18n translation of panel titles
  element: ReactNode;
  defaultWidth: number;
  defaultHeight: number;
  icon?: string;
  isImageIcon?: boolean;
}

interface PanelState {
  entry: PanelEntry;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isExpanded: boolean;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  preExpandedSize?: { width: number; height: number };
  preExpandedPosition?: { x: number; y: number };
  zIndex: number;
  panelProps?: Record<string, any>;
}

interface SettingsPanelProps {
  initialTab?:
    | "avatar"
    | "theme"
    | "language"
    | "developer"
    | "sticky-notes"
    | "toolbar"
    | "mini-panels"
    | "custom-widgets";
}

function SettingsPanel({ initialTab = "avatar" }: SettingsPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<
    | "avatar"
    | "theme"
    | "language"
    | "developer"
    | "sticky-notes"
    | "toolbar"
    | "mini-panels"
    | "custom-widgets"
  >(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [devUsername, setDevUsername] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [themePrefs, setThemePrefs] = useState(() => loadPreferences());
  const [stickyNoteSettings, setStickyNoteSettings] = useState(() => {
    const saved = localStorage.getItem("sticky-notes-settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { defaultReminderHours: 1, enableNotifications: true };
      }
    }
    return { defaultReminderHours: 1, enableNotifications: true };
  });

  // Mini panel form state
  const [miniPanelName, setMiniPanelName] = useState("");
  const [miniPanelSize, setMiniPanelSize] = useState<
    "small" | "medium" | "large"
  >("small");
  const [miniPanelType, setMiniPanelType] = useState("custom");
  const [existingMiniPanels, setExistingMiniPanels] = useState(() => {
    const saved = localStorage.getItem("luccca-mini-panels");
    return saved ? JSON.parse(saved) : [];
  });

  // Update activeTab when initialTab changes (e.g., when re-opening settings panel)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleCreateMiniPanel = () => {
    if (!miniPanelName.trim()) {
      alert("Please enter a panel name");
      return;
    }

    const sizes = {
      small: { width: 400, height: 300 },
      medium: { width: 600, height: 400 },
      large: { width: 800, height: 600 },
    };

    const newPanel = {
      id: `panel-${Date.now()}`,
      title: miniPanelName,
      panelId: miniPanelType,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      size: sizes[miniPanelSize],
      isPinned: false,
      isMinimized: false,
    };

    const updated = [...existingMiniPanels, newPanel];
    setExistingMiniPanels(updated);
    localStorage.setItem("luccca-mini-panels", JSON.stringify(updated));

    // Dispatch event to update mini panel container
    window.dispatchEvent(
      new CustomEvent("mini-panels-updated", { detail: { panels: updated } }),
    );

    // Reset form
    setMiniPanelName("");
    setMiniPanelSize("small");
    setMiniPanelType("custom");
  };

  const handleDeleteMiniPanel = (panelId: string) => {
    const updated = existingMiniPanels.filter((p: any) => p.id !== panelId);
    setExistingMiniPanels(updated);
    localStorage.setItem("luccca-mini-panels", JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("mini-panels-updated", { detail: { panels: updated } }),
    );
  };

  const [toolbarSettings, setToolbarSettings] = useState(() => {
    const saved = localStorage.getItem("toolbar-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          autohide: parsed.autohide ?? false,
          pinned: parsed.pinned ?? false,
          showQuickSearch: parsed.showQuickSearch ?? true,
          showNotifications: parsed.showNotifications ?? true,
          showQuickMetrics: parsed.showQuickMetrics ?? true,
          showStaffStatus: parsed.showStaffStatus ?? true,
        };
      } catch {
        return {
          autohide: false,
          pinned: false,
          showQuickSearch: true,
          showNotifications: true,
          showQuickMetrics: true,
          showStaffStatus: true,
        };
      }
    }
    return {
      autohide: false,
      pinned: false,
      showQuickSearch: true,
      showNotifications: true,
      showQuickMetrics: true,
      showStaffStatus: true,
    };
  });
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    const saved = localStorage.getItem("user-avatar");
    return saved || "Echo_B"; // Default to Echo_B
  });
  const [dashboardWidgets, setDashboardWidgets] = useState(() => {
    const saved = localStorage.getItem("restaurant-dashboard-widgets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Sync dashboardWidgets when the Dashboard Widgets tab is opened
  const handleDashboardWidgetsTabOpen = () => {
    const saved = localStorage.getItem("restaurant-dashboard-widgets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDashboardWidgets(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDashboardWidgets([]);
      }
    }
  };

  // Handle theme preference changes
  const handleThemeChange = (
    theme?: ThemeName,
    font?: FontName,
    appearance?: AppearanceMode,
    backgroundImage?: string,
  ) => {
    const nextAppearance = appearance ?? themePrefs.appearance;
    const isDarkMode = nextAppearance === "dark";
    const newPrefs: ThemePreferences = {
      theme: theme ?? themePrefs.theme,
      font: font ?? themePrefs.font,
      appearance: nextAppearance,
      fontScale: themePrefs.fontScale,
      highContrast: themePrefs.highContrast,
      backgroundImageLight: isDarkMode
        ? themePrefs.backgroundImageLight
        : (backgroundImage ?? themePrefs.backgroundImageLight),
      backgroundImageDark: isDarkMode
        ? (backgroundImage ?? themePrefs.backgroundImageDark)
        : themePrefs.backgroundImageDark,
      backgroundOpacityLight: isDarkMode
        ? (themePrefs.backgroundOpacityLight ?? 0.5)
        : (themePrefs.backgroundOpacityLight ?? 0.5),
      backgroundOpacityDark: isDarkMode
        ? (themePrefs.backgroundOpacityDark ?? 0.5)
        : (themePrefs.backgroundOpacityDark ?? 0.5),
    };
    setThemePrefs(newPrefs);
    applyTheme(newPrefs);
    savePreferences(newPrefs);
    window.dispatchEvent(
      new CustomEvent("theme-preferences-changed", { detail: newPrefs }),
    );
  };

  const handleDeveloperAuthorize = (
    e?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (devUsername.trim() && devPassword.trim()) {
      // Validate password against LUCCCA
      if (devPassword !== "LUCCCA") {
        console.warn("[DEV MODE] Invalid password");
        alert("Invalid password. Please try again.");
        setDevPassword("");
        return;
      }

      console.log("[DEV MODE] Authorizing user:", devUsername);

      // Enable developer mode and grant ZARO access
      localStorage.setItem("dev_mode", "true");
      localStorage.setItem("dev_username", devUsername);

      try {
        // Open EchoCoder panel
        const event = new CustomEvent("open-panel", {
          detail: { id: "echo" },
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(event);
        console.log("[DEV MODE] Dispatched open-panel event for echo");

        // Also open ZARO Guardian for system safety
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("open-panel", {
              detail: { id: "zaro" },
              bubbles: true,
              cancelable: true,
            }),
          );
          console.log("[DEV MODE] Dispatched open-panel event for ZARO");
        }, 500);
      } catch (error) {
        console.error("[DEV MODE] Error dispatching event:", error);
      }
    } else {
      console.warn("[DEV MODE] Both username and password required");
    }
  };

  return (
    <div className="w-full h-full flex bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-border/20 transition-all duration-300 overflow-hidden",
          "bg-surface",
          sidebarOpen ? "w-56" : "w-0",
        )}
      >
        <div className="p-3 space-y-1 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="px-3 py-3 mb-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              {t("settings.title")}
            </h3>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-0.5 flex-1">
            {[
              {
                id: "avatar" as const,
                label: t("settings.avatar"),
                icon: "👤",
              },
              { id: "theme" as const, label: t("settings.theme"), icon: "🎨" },
              {
                id: "language" as const,
                label: t("settings.language"),
                icon: "🌐",
              },
              {
                id: "dashboard-widgets" as const,
                label: t("settings.dashboard-widgets"),
                icon: "📊",
              },
              {
                id: "mini-panels" as const,
                label: t("settings.mini-panels"),
              },
              {
                id: "custom-widgets" as const,
                label: t("settings.custom-widgets"),
                icon: "🔧",
              },
              {
                id: "toolbar" as const,
                label: t("settings.toolbar"),
                icon: "⚙️",
              },
              {
                id: "sticky-notes" as const,
                label: t("settings.sticky-notes"),
                icon: "📝",
              },
              {
                id: "developer" as const,
                label: t("settings.developer"),
                icon: "💻",
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  // Sync dashboard widgets when that tab is opened
                  if (item.id === "dashboard-widgets") {
                    handleDashboardWidgetsTabOpen();
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg transition-all duration-150 flex items-center gap-3 text-sm font-medium",
                  activeTab === item.id
                    ? "bg-primary/25 text-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-primary/10 hover:text-foreground",
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {activeTab === item.id && (
                  <span className="text-primary text-lg">&rsaquo;</span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-2 border-t border-border/20">
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-foreground/50 hover:text-foreground/70 flex items-center gap-2 transition-colors"
            >
              <span>&lsaquo;</span>
              <span>{t("settings.collapse")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-background">
        <div className="max-w-5xl">
          {/* Toggle Sidebar Button - Hidden when sidebar is open */}
          <button
            className={cn(
              "mb-4 px-3 py-2 text-sm text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors inline-flex items-center gap-2",
              sidebarOpen && "hidden",
            )}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span>{sidebarOpen ? "◀" : "▶"}</span>
            {sidebarOpen ? t("settings.collapse") : t("settings.expand")}
          </button>

          {/* Avatar Section */}
          {!sidebarOpen ? (
            <div className="text-sm text-foreground/60 mb-4">
              Click "Expand Settings" in the sidebar to view settings.
            </div>
          ) : null}
          {activeTab === "avatar" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.avatar")}
              </h2>
              <AvatarSelector
                selectedAvatar={selectedAvatar}
                onAvatarSelect={setSelectedAvatar}
              />
            </div>
          )}

          {/* Theme Section */}
          {activeTab === "theme" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t("settings.theme")} & Typography
                </h2>
                <p className="text-sm text-foreground/60 mt-1">
                  Customize your appearance and typography
                </p>
              </div>

              {/* Appearance Mode Selection (Light/Dark) */}
              <div className="space-y-4 pb-6 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">
                  Appearance
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() =>
                      handleThemeChange(undefined, undefined, "light")
                    }
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-center space-y-2",
                      themePrefs.appearance === "light"
                        ? "border-primary bg-primary/10"
                        : "border-border/30 hover:border-border/50",
                    )}
                  >
                    <div className="text-2xl">☀️</div>
                    <div className="text-sm font-medium text-foreground">
                      Light
                    </div>
                    <div className="text-xs text-foreground/60">
                      Bright and clean
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      handleThemeChange(undefined, undefined, "dark")
                    }
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-center space-y-2",
                      themePrefs.appearance === "dark"
                        ? "border-primary bg-primary/10"
                        : "border-border/30 hover:border-border/50",
                    )}
                  >
                    <div className="text-2xl">🌙</div>
                    <div className="text-sm font-medium text-foreground">
                      Dark
                    </div>
                    <div className="text-xs text-foreground/60">
                      Easy on eyes
                    </div>
                  </button>
                  <button
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-center space-y-2 opacity-50 cursor-not-allowed",
                      "border-border/30",
                    )}
                    disabled
                    title="Auto theme – configure in next release"
                  >
                    <div className="text-2xl">🤖</div>
                    <div className="text-sm font-medium text-foreground">
                      Auto
                    </div>
                    <div className="text-xs text-foreground/60">
                      System preference
                    </div>
                  </button>
                </div>
              </div>

              {/* System Theme Selection */}
              <div className="space-y-4 pb-6 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">
                  System Theme
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(THEMES).map(([key, theme]) => {
                    const isDarkMode = themePrefs.appearance === "dark";
                    const bgColor = isDarkMode
                      ? theme.colorsBackground.dark
                      : theme.colorsBackground.light;
                    const textColor = isDarkMode
                      ? theme.colorsText.dark
                      : theme.colorsText.light;
                    const primaryColor = isDarkMode
                      ? theme.colorsPrimary.dark
                      : theme.colorsPrimary.light;
                    const surfaceColor = isDarkMode
                      ? theme.colorsSurface.dark
                      : theme.colorsSurface.light;

                    return (
                      <button
                        key={key}
                        onClick={() => handleThemeChange(key as ThemeName)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all space-y-3",
                          themePrefs.theme === key
                            ? "border-primary bg-primary/10"
                            : "border-border/30 hover:border-border/50",
                        )}
                      >
                        {/* Color Preview */}
                        <div className="flex gap-1.5 h-8 rounded-lg overflow-hidden">
                          <div
                            className="flex-1"
                            style={{ backgroundColor: primaryColor }}
                            title="Primary color"
                          />
                          <div
                            className="flex-1"
                            style={{ backgroundColor: surfaceColor }}
                            title="Surface color"
                          />
                          <div
                            className="flex-1 border border-foreground/20"
                            style={{ backgroundColor: bgColor }}
                            title="Background"
                          />
                        </div>
                        <div>
                          <div className="text-lg mb-0.5">{theme.icon}</div>
                          <div className="text-sm font-semibold text-foreground">
                            {theme.label}
                          </div>
                          <div className="text-xs text-foreground/60 mt-1">
                            {theme.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Selection */}
              <div className="space-y-4 pb-6 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">
                  Font Family
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(FONTS).map(([key, font]) => (
                    <button
                      key={key}
                      onClick={() =>
                        handleThemeChange(undefined, key as FontName)
                      }
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all",
                        themePrefs.font === key
                          ? "border-primary bg-primary/10"
                          : "border-border/30 hover:border-border/50",
                      )}
                      style={{ fontFamily: font.fontFamily }}
                    >
                      <div className="text-2xl font-bold text-foreground mb-1">
                        Aa
                      </div>
                      <div className="font-semibold text-sm text-foreground">
                        {font.label}
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        {font.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Image */}
              <div className="space-y-4 pb-6 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">
                  Background Image
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-sm cursor-pointer flex-1"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const dataUrl = event.target?.result as string;
                            handleThemeChange(
                              undefined,
                              undefined,
                              undefined,
                              dataUrl,
                            );
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Preview
                </h3>
                <div
                  className="p-4 rounded-lg border border-border/30"
                  style={{
                    fontFamily: FONTS[themePrefs.font].fontFamily,
                    backgroundColor:
                      themePrefs.appearance === "dark"
                        ? THEMES[themePrefs.theme].colorsSurface.dark
                        : THEMES[themePrefs.theme].colorsSurface.light,
                    color:
                      themePrefs.appearance === "dark"
                        ? THEMES[themePrefs.theme].colorsText.dark
                        : THEMES[themePrefs.theme].colorsText.light,
                  }}
                >
                  <p className="text-sm font-semibold mb-2">
                    This is how text looks
                  </p>
                  <p className="text-xs opacity-70">
                    {THEMES[themePrefs.theme].label} +{" "}
                    {FONTS[themePrefs.font].label} ({themePrefs.appearance}{" "}
                    mode)
                  </p>
                  <div className="mt-3 flex gap-2">
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{
                        backgroundColor:
                          themePrefs.appearance === "dark"
                            ? THEMES[themePrefs.theme].colorsPrimary.dark
                            : THEMES[themePrefs.theme].colorsPrimary.light,
                      }}
                    />
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{
                        backgroundColor:
                          themePrefs.appearance === "dark"
                            ? THEMES[themePrefs.theme].colorsAccent.dark
                            : THEMES[themePrefs.theme].colorsAccent.light,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Language Section */}
          {activeTab === "language" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.language")}
              </h2>
              <div className="flex items-center justify-between p-4 bg-background/60 rounded-lg border border-border/30">
                <span className="text-sm font-medium text-foreground">
                  {t("settings.language.select")}
                </span>
                <LanguageSelect />
              </div>
            </div>
          )}

          {/* Dashboard Widgets Section */}
          {activeTab === "dashboard-widgets" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.dashboard-widgets")}
              </h2>
              <p className="text-sm text-foreground/70">
                Manage which widgets are displayed on your dashboard
              </p>
              {dashboardWidgets.length > 0 ? (
                <div className="space-y-2 p-4 bg-background/60 rounded-lg border border-border/30">
                  {dashboardWidgets.map((widget: any) => (
                    <label
                      key={widget.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-background/40 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={widget.enabled}
                        onChange={(e) => {
                          const updated = dashboardWidgets.map((w: any) =>
                            w.id === widget.id
                              ? { ...w, enabled: e.target.checked }
                              : w,
                          );
                          setDashboardWidgets(updated);
                          localStorage.setItem(
                            "restaurant-dashboard-widgets",
                            JSON.stringify(updated),
                          );
                          window.dispatchEvent(
                            new CustomEvent("dashboard-widgets-updated", {
                              detail: { widgets: updated },
                            }),
                          );
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {widget.icon} {widget.name}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {widget.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-background/40 rounded-lg border border-border/30 text-center">
                  <p className="text-sm text-foreground/60">
                    No widgets configured yet
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Toolbar Section */}
          {activeTab === "toolbar" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.toolbar")}
              </h2>

              <div className="space-y-4 p-4 bg-background/60 rounded-lg border border-border/30">
                <div className="border-b border-border/30 pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toolbarSettings.pinned}
                      onChange={(e) => {
                        const newSettings = {
                          ...toolbarSettings,
                          pinned: e.target.checked,
                        };
                        setToolbarSettings(newSettings);
                        localStorage.setItem(
                          "toolbar-settings",
                          JSON.stringify(newSettings),
                        );
                        window.dispatchEvent(
                          new CustomEvent("toolbar-settings-changed", {
                            detail: newSettings,
                          }),
                        );
                      }}
                      className="w-4 h-4 rounded border border-border/30 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Pin Toolbar
                      </span>
                      <p className="text-xs text-foreground/60">
                        Keep the toolbar always visible.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-b border-border/30 pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toolbarSettings.autohide}
                      onChange={(e) => {
                        const newSettings = {
                          ...toolbarSettings,
                          autohide: e.target.checked,
                        };
                        setToolbarSettings(newSettings);
                        localStorage.setItem(
                          "toolbar-settings",
                          JSON.stringify(newSettings),
                        );
                        window.dispatchEvent(
                          new CustomEvent("toolbar-settings-changed", {
                            detail: newSettings,
                          }),
                        );
                      }}
                      className="w-4 h-4 rounded border border-border/30 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Auto-hide Toolbar
                      </span>
                      <p className="text-xs text-foreground/60">
                        Toolbar appears on mouse hover.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-b border-border/30 pb-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Toolbar Components
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toolbarSettings.showQuickSearch ?? true}
                          onChange={(e) => {
                            const newSettings = {
                              ...toolbarSettings,
                              showQuickSearch: e.target.checked,
                            };
                            setToolbarSettings(newSettings);
                            localStorage.setItem(
                              "toolbar-settings",
                              JSON.stringify(newSettings),
                            );
                            window.dispatchEvent(
                              new CustomEvent("toolbar-settings-changed", {
                                detail: newSettings,
                              }),
                            );
                          }}
                          className="w-4 h-4 rounded border border-border/30 accent-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            🔍 Quick Search
                          </span>
                          <p className="text-xs text-foreground/60">
                            Search modules, recipes, staff
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toolbarSettings.showNotifications ?? true}
                          onChange={(e) => {
                            const newSettings = {
                              ...toolbarSettings,
                              showNotifications: e.target.checked,
                            };
                            setToolbarSettings(newSettings);
                            localStorage.setItem(
                              "toolbar-settings",
                              JSON.stringify(newSettings),
                            );
                            window.dispatchEvent(
                              new CustomEvent("toolbar-settings-changed", {
                                detail: newSettings,
                              }),
                            );
                          }}
                          className="w-4 h-4 rounded border border-border/30 accent-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            🔔 Notifications/Alerts
                          </span>
                          <p className="text-xs text-foreground/60">
                            Badge showing pending alerts
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toolbarSettings.showQuickMetrics ?? true}
                          onChange={(e) => {
                            const newSettings = {
                              ...toolbarSettings,
                              showQuickMetrics: e.target.checked,
                            };
                            setToolbarSettings(newSettings);
                            localStorage.setItem(
                              "toolbar-settings",
                              JSON.stringify(newSettings),
                            );
                            window.dispatchEvent(
                              new CustomEvent("toolbar-settings-changed", {
                                detail: newSettings,
                              }),
                            );
                          }}
                          className="w-4 h-4 rounded border border-border/30 accent-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            📊 Quick Metrics
                          </span>
                          <p className="text-xs text-foreground/60">
                            Small dashboard peek
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toolbarSettings.showStaffStatus ?? true}
                          onChange={(e) => {
                            const newSettings = {
                              ...toolbarSettings,
                              showStaffStatus: e.target.checked,
                            };
                            setToolbarSettings(newSettings);
                            localStorage.setItem(
                              "toolbar-settings",
                              JSON.stringify(newSettings),
                            );
                            window.dispatchEvent(
                              new CustomEvent("toolbar-settings-changed", {
                                detail: newSettings,
                              }),
                            );
                          }}
                          className="w-4 h-4 rounded border border-border/30 accent-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            👥 Staff Status
                          </span>
                          <p className="text-xs text-foreground/60">
                            Quick view of who's on duty
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-foreground/60 mt-4">
                  💡 Tip: Pin toolbar to disable auto-hide. The toolbar will
                  always remain above panels with full z-index priority.
                </p>
              </div>
            </div>
          )}

          {/* Sticky Notes Section */}
          {activeTab === "sticky-notes" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.sticky-notes")}
              </h2>

              <div className="space-y-4 p-4 bg-background/60 rounded-lg border border-border/30">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Default Reminder Time
                  </label>
                  <select
                    value={stickyNoteSettings.defaultReminderHours}
                    onChange={(e) => {
                      const newSettings = {
                        ...stickyNoteSettings,
                        defaultReminderHours: parseInt(e.target.value),
                      };
                      setStickyNoteSettings(newSettings);
                      localStorage.setItem(
                        "sticky-notes-settings",
                        JSON.stringify(newSettings),
                      );
                    }}
                    className="w-full px-3 py-2 border border-border/30 rounded bg-background text-foreground text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value={0.25}>15 minutes</option>
                    <option value={0.5}>30 minutes</option>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={24}>1 day</option>
                  </select>
                  <p className="text-xs text-foreground/60 mt-1">
                    Set the default reminder time for new sticky notes.
                  </p>
                </div>

                <div className="border-t border-border/30 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stickyNoteSettings.enableNotifications}
                      onChange={(e) => {
                        const newSettings = {
                          ...stickyNoteSettings,
                          enableNotifications: e.target.checked,
                        };
                        setStickyNoteSettings(newSettings);
                        localStorage.setItem(
                          "sticky-notes-settings",
                          JSON.stringify(newSettings),
                        );
                      }}
                      className="w-4 h-4 rounded border border-border/30 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Enable Notifications
                      </span>
                      <p className="text-xs text-foreground/60">
                        Show browser notifications when reminders are due.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-t border-border/30 pt-4">
                  <button
                    onClick={() => {
                      if ("Notification" in window) {
                        if (Notification.permission === "granted") {
                          new Notification("Sticky Notes", {
                            body: "Notifications are enabled!",
                            icon: "📝",
                          });
                        } else if (Notification.permission !== "denied") {
                          Notification.requestPermission().then(
                            (permission) => {
                              if (permission === "granted") {
                                new Notification("Sticky Notes", {
                                  body: "Notifications enabled!",
                                  icon: "📝",
                                });
                              }
                            },
                          );
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-primary/20 hover:bg-primary/30 text-foreground rounded text-sm transition-colors"
                  >
                    Test Notification
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Developer Section */}
          {activeTab === "developer" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.developer")}
              </h2>
              <p className="text-sm text-foreground/60">
                Authenticate to access developer tools and EchoCoder.
              </p>

              <div className="space-y-3 p-4 bg-background/60 rounded-lg border border-border/30">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={devUsername}
                    onChange={(e) => setDevUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 border border-border/30 rounded bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-border/30 rounded bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/50 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeveloperAuthorize(e)}
                  disabled={!devUsername.trim() || !devPassword.trim()}
                  className={cn(
                    "w-full px-4 py-2 rounded font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50",
                    devUsername.trim() && devPassword.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed",
                  )}
                >
                  Authorize & Launch EchoCoder
                </button>
              </div>
            </div>
          )}

          {/* Mini Panels Section */}
          {activeTab === "mini-panels" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("settings.mini-panels")}
              </h2>
              <p className="text-sm text-foreground/70">
                Create and manage custom mini panels for quick access to
                specific features and metrics
              </p>

              <div className="space-y-4 p-4 bg-background/60 rounded-lg border border-border/30">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Panel Name
                  </label>
                  <input
                    type="text"
                    value={miniPanelName}
                    onChange={(e) => setMiniPanelName(e.target.value)}
                    placeholder="Enter a name for your mini panel"
                    className="w-full px-3 py-2 border border-border/30 rounded bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Panel Size
                  </label>
                  <select
                    value={miniPanelSize}
                    onChange={(e) => setMiniPanelSize(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border/30 rounded bg-background text-foreground text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="small">Small (400x300px)</option>
                    <option value="medium">Medium (600x400px)</option>
                    <option value="large">Large (800x600px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Panel Type
                  </label>
                  <select
                    value={miniPanelType}
                    onChange={(e) => setMiniPanelType(e.target.value)}
                    className="w-full px-3 py-2 border border-border/30 rounded bg-background text-foreground text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="custom">Custom Panel</option>
                    <option value="metrics">Metrics Dashboard</option>
                    <option value="notes">Quick Notes</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateMiniPanel}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Create Mini Panel
                </button>
              </div>

              {existingMiniPanels.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Existing Mini Panels
                  </h3>
                  <div className="space-y-2">
                    {existingMiniPanels.map((panel: any) => (
                      <div
                        key={panel.id}
                        className="p-3 bg-background/60 border border-border/30 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {panel.title}
                          </div>
                          <div className="text-xs text-foreground/60">
                            {panel.size.width}x{panel.size.height}px •{" "}
                            {panel.panelId}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => handleDeleteMiniPanel(panel.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs text-foreground/70">
                  💡 <strong>Tip:</strong> Create mini panels to monitor
                  specific metrics, track individual outlets, or focus on
                  particular areas of your restaurant operations. Each panel can
                  be positioned, resized, and pinned for quick access.
                </p>
              </div>
            </div>
          )}

          {/* Custom Widgets Section */}
          {activeTab === "custom-widgets" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t("settings.custom-widgets")}
                </h2>
                <p className="text-sm text-foreground/60 mt-1">
                  Create custom dashboard widgets by combining multiple metrics
                </p>
              </div>

              <CustomWidgetBuilder
                onCreateWidget={(widget: CustomWidget) => {
                  window.dispatchEvent(
                    new CustomEvent("custom-widget-created", {
                      detail: { widget },
                    }),
                  );
                }}
              />

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs text-foreground/70">
                  💡 <strong>Tip:</strong> Custom widgets let you combine
                  related metrics into one view. For example, pair "Labor Cost
                  %" with "Covers Served" to monitor labor efficiency, or
                  combine "Sales Revenue" with "Peak Sales Hour" to identify
                  your busiest times.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize Panel component to prevent re-renders when parent updates
// Only re-render when panelState, isFocused, or callbacks change
const Panel = memo(function PanelComponent({
  panelState,
  isFocused,
  onClose,
  onMinimize,
  onFocus,
  onResize,
  onPositionChange,
  onToggleExpand,
}: {
  panelState: PanelState;
  isFocused?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onResize: (size: { width: number; height: number }) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onToggleExpand: () => void;
}) {
  // Safety check: ensure panelState and entry are defined
  // This handles race conditions during panel deletion
  if (!panelState || !panelState.entry || !panelState.entry.element) {
    if (panelState) {
      console.debug("[Panel] Panel state incomplete, likely being deleted:", {
        hasState: !!panelState,
        hasEntry: !!panelState?.entry,
        hasElement: !!panelState?.entry?.element,
      });
    }
    return null;
  }

  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    panelX: 0,
    panelY: 0,
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(panelState.position);
  const [size, setSize] = useState(panelState.size);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  const EDGE_THRESHOLD = 16; // pixels from edge to trigger resize

  // Helper: Detect which edge the mouse is near
  const getEdgeAtPoint = (
    e: React.MouseEvent<HTMLDivElement> | MouseEvent,
  ): string | null => {
    if (!panelRef.current) return null;
    const rect = panelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const top = y < EDGE_THRESHOLD;
    const bottom = y > rect.height - EDGE_THRESHOLD;
    const left = x < EDGE_THRESHOLD;
    const right = x > rect.width - EDGE_THRESHOLD;

    if (top && left) return "nw";
    if (top && right) return "ne";
    if (bottom && left) return "sw";
    if (bottom && right) return "se";
    if (top) return "n";
    if (bottom) return "s";
    if (left) return "w";
    if (right) return "e";
    return null;
  };

  // Helper: Get cursor style based on edge
  const getCursorClass = (edge: string | null): string => {
    const cursorMap: Record<string, string> = {
      n: "cursor-n-resize",
      s: "cursor-s-resize",
      e: "cursor-e-resize",
      w: "cursor-w-resize",
      ne: "cursor-ne-resize",
      nw: "cursor-nw-resize",
      se: "cursor-se-resize",
      sw: "cursor-sw-resize",
    };
    return cursorMap[edge || ""] || "cursor-default";
  };

  // Sync position when panelState changes (e.g., from grid/cascade layout)
  useEffect(() => {
    setPosition(panelState.position);
  }, [panelState.position]);

  // Sync size when panelState changes
  useEffect(() => {
    setSize(panelState.size);
  }, [panelState.size]);

  // Keyboard shortcut for expansion: Alt+E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        onToggleExpand();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, onToggleExpand]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!panelRef.current || !panelState.entry) return;

    const isStickyNote = (panelState.entry.id as string).startsWith(
      "sticky-note-",
    );
    const isTitleBar = (e.target as HTMLElement).closest(".panel-title-bar");

    // For sticky notes, allow drag from anywhere. For other panels, only from title bar
    if (!isStickyNote && !isTitleBar) {
      e.preventDefault();
      return;
    }

    // Set drag data for whiteboard drop
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: panelState.entry.id,
        title: panelState.entry.title,
        type: "panel",
        panelId: panelState.entry.id,
      }),
    );

    // Use transparent drag image for minimal visual feedback (browser default is the element itself)
    // This removes the "Panel" square and creates a cleaner drag experience
    const transparentImg = new Image();
    transparentImg.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    e.dataTransfer.setDragImage(transparentImg, 0, 0);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    onFocus();
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const getCursorStyle = (edge: string | null): string => {
    if (!edge) return "default";
    if (edge.includes("nw")) return "nw-resize";
    if (edge.includes("ne")) return "ne-resize";
    if (edge.includes("sw")) return "sw-resize";
    if (edge.includes("se")) return "se-resize";
    if (edge.includes("n") || edge.includes("s")) return "ns-resize";
    if (edge.includes("e") || edge.includes("w")) return "ew-resize";
    return "default";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Always update hover edge detection for visual feedback
    const edge = getEdgeAtPoint(e);
    setHoverEdge(edge);
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const edge = getEdgeAtPoint(e);
    if (edge) {
      setResizeEdge(edge);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        panelX: position.x,
        panelY: position.y,
      });
      setIsResizing(true);
      onFocus();

      // Prevent cursor flickering during resize
      document.body.style.userSelect = "none";
      document.body.style.cursor = getCursorStyle(edge);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number | null = null;
    let lastMouseEvent: MouseEvent | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      lastMouseEvent = e;

      // Schedule animation frame update if not already scheduled
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          if (!lastMouseEvent) return;

          let newX = lastMouseEvent.clientX - dragOffset.x;
          let newY = lastMouseEvent.clientY - dragOffset.y;

          // Use panelRef to get current dimensions for clamping
          if (panelRef.current) {
            const panelWidth = panelRef.current.offsetWidth;
            const panelHeight = panelRef.current.offsetHeight;

            // Soft clamp: allow some off-screen but keep panel mostly visible
            const minX = -panelWidth + 80; // Keep at least 80px visible on left
            const maxX = window.innerWidth - 80; // Keep at least 80px visible on right
            const minY = 0; // Keep title bar visible
            const maxY = window.innerHeight - 30; // Keep at least 30px visible at bottom

            newX = Math.max(minX, Math.min(newX, maxX));
            newY = Math.max(minY, Math.min(newY, maxY));
          }

          setPosition({ x: newX, y: newY });
          onPositionChange?.({ x: newX, y: newY });
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      document.body.style.cursor = "";
    };

    // Use regular (non-passive) listeners for mouse moves to allow preventDefault if needed
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (!isResizing || !resizeEdge) return;

    let lastUpdate = 0;
    const throttleMs = 16; // ~60fps throttling

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle updates to prevent excessive re-renders and maintain smooth resize
      if (now - lastUpdate < throttleMs) {
        return;
      }
      lastUpdate = now;

      if (!panelRef.current) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.panelX;
      let newY = resizeStart.panelY;

      // Handle width changes (minimum 350px for usability)
      if (resizeEdge.includes("e")) {
        newWidth = Math.max(350, resizeStart.width + deltaX);
      } else if (resizeEdge.includes("w")) {
        newWidth = Math.max(350, resizeStart.width - deltaX);
        newX = resizeStart.panelX + deltaX;
      }

      // Handle height changes (minimum 250px for usability)
      if (resizeEdge.includes("s")) {
        newHeight = Math.max(250, resizeStart.height + deltaY);
      } else if (resizeEdge.includes("n")) {
        newHeight = Math.max(250, resizeStart.height - deltaY);
        newY = resizeStart.panelY + deltaY;
      }

      const clampedSize = {
        width: newWidth,
        height: newHeight,
      };

      setSize(clampedSize);
      setPosition({ x: newX, y: newY });
      onResize(clampedSize);
      onPositionChange?.({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
      // Restore normal cursor and selection
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    // Use passive listener for better scroll performance
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Ensure cleanup if component unmounts during resize
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, resizeEdge, resizeStart, onResize, onPositionChange]);

  const isDashboard = panelState.entry.id === "dashboard";
  const [isHovering, setIsHovering] = useState(false);

  const isStickyNote = (panelState.entry.id as string).startsWith(
    "sticky-note-",
  );
  const panelKey = (panelState.entry.panelKey ||
    panelState.entry.id) as PanelKey;
  const metadataIcon = PANEL_METADATA[panelKey]?.icon;
  const preferredMetadataIcon =
    metadataIcon && metadataIcon.startsWith("http") ? metadataIcon : undefined;
  const icon =
    preferredMetadataIcon ||
    panelState.entry.icon ||
    (metadataIcon && metadataIcon.length > 0 ? metadataIcon : undefined);
  const isImageIcon =
    panelState.entry.isImageIcon ?? (!!icon && icon.startsWith("http"));

  // Memoize event handlers to prevent function recreation
  const memoizedOnFocus = useCallback(onFocus, [onFocus]);
  const memoizedOnMinimize = useCallback(onMinimize, [onMinimize]);
  const memoizedOnClose = useCallback(onClose, [onClose]);
  const memoizedOnResize = useCallback(onResize, [onResize]);
  const memoizedOnPositionChange = useCallback(
    (pos) => onPositionChange?.(pos),
    [onPositionChange],
  );

  return (
    <div
      ref={panelRef}
      data-panel-id={panelState.entry.id}
      draggable={!isStickyNote}
      onDragStart={!isStickyNote ? handleDragStart : undefined}
      onMouseMove={isDragging ? undefined : handleMouseMove}
      onMouseEnter={() => !isDragging && setIsHovering(true)}
      onMouseLeave={() => !isDragging && setIsHovering(false)}
      onClick={() => {
        // Bring panel to focus when clicked anywhere (except buttons)
        onFocus();
      }}
      onMouseDown={(e) => {
        // For sticky notes, start drag from anywhere except buttons
        if (isStickyNote) {
          const target = e.target as HTMLElement;
          // Don't start drag if clicking on button or text input, but allow textarea
          if (
            !target.closest("button") &&
            !target.closest("input[type='text']") &&
            !target.closest("input[type='number']")
          ) {
            handleMouseDown(e);
          }
          onFocus();
        } else {
          // For other panels, only focus
          onFocus();
        }
      }}
      className={cn(
        "fixed rounded-lg flex flex-col bg-background pointer-events-auto",
        !isDragging &&
          !isResizing &&
          "transition-[border,box-shadow,transform,width,height] duration-300 ease-out",
        isDashboard && "glass-panel",
        isStickyNote && "cursor-move",
      )}
      style={{
        left: "0",
        top: "0",
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: panelState.isMinimized ? `${size.width}px` : `${size.width}px`,
        height: panelState.isMinimized ? "auto" : `${size.height}px`,
        zIndex: panelState.isExpanded ? 20100 : panelState.zIndex,
        border:
          isFocused && !isDragging
            ? "2px solid rgba(59, 130, 246, 0.8)"
            : isHovering && !isDragging
              ? "1.5px solid rgba(59, 130, 246, 0.5)"
              : "1px solid rgba(148, 163, 184, 0.2)",
        boxShadow:
          isFocused && !isDragging
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 50px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.15)"
            : isHovering && !isDragging
              ? window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "0 15px 35px -5px rgba(0, 0, 0, 0.3), 0 0 25px rgba(59, 130, 246, 0.15)"
                : "0 15px 35px -5px rgba(0, 0, 0, 0.15), 0 0 20px rgba(0, 0, 0, 0.1)"
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        overflow: panelState.isMinimized || isStickyNote ? "visible" : "hidden",
        // For sticky notes, extend the padding to create a 6px grab area
        ...(isStickyNote && { margin: "-6px" }),
        // Optimize rendering - GPU accelerated transforms don't cause reflow
        willChange:
          isDragging || isResizing ? "transform, width, height" : "auto",
      }}
    >
      {/* Title bar - draggable (hidden for sticky notes) */}
      {!(panelState.entry.id as string).startsWith("sticky-note-") && (
        <div
          draggable={false}
          onMouseDown={(e) => {
            // Always focus on any title bar interaction
            if (!isFocused) onFocus();
            handleMouseDown(e);
          }}
          className={cn(
            "panel-title-bar flex items-center justify-between gap-2 cursor-move select-none flex-shrink-0",
            isDashboard ? "" : "hover:bg-primary/15",
          )}
          style={{
            padding: "3px 16px 0",
            backgroundColor: "rgba(93, 72, 153, 1)",
            border: "1px solid rgba(28, 28, 202, 1)",
          }}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-foreground/60" />
            <div className="flex items-center justify-center flex-shrink-0 w-5 h-5">
              {isImageIcon && icon ? (
                <img
                  src={icon}
                  alt={panelState.entry.title}
                  className="w-full h-full object-contain"
                />
              ) : icon ? (
                <span className="text-base">{icon}</span>
              ) : null}
            </div>
            <h3 className="font-semibold text-foreground">
              {panelState.entry.title}
            </h3>
          </div>

          {/* Spacer to push content to the right */}
          <div className="flex-1" />

          <div className="flex items-center gap-0.5 ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={
                panelState.isExpanded
                  ? "Restore to normal size"
                  : "Expand to full screen"
              }
              className="inline-flex items-center justify-center w-9 h-9 text-foreground hover:text-primary hover:bg-primary/20 rounded-md transition-all duration-200 hover:scale-110"
              title={
                panelState.isExpanded ? "Restore (Alt+E)" : "Expand (Alt+E)"
              }
            >
              {panelState.isExpanded ? (
                <Minimize2 size={16} />
              ) : (
                <Maximize2 size={16} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                memoizedOnMinimize();
              }}
              aria-label={
                panelState.isMinimized ? "Expand panel" : "Minimize to dock"
              }
              className="inline-flex items-center justify-center w-9 h-9 text-lg font-bold text-foreground hover:text-primary hover:bg-primary/20 rounded-md transition-all duration-200 hover:scale-110"
              title={
                panelState.isMinimized ? "Expand panel" : "Minimize to dock"
              }
            >
              {panelState.isMinimized ? "+" : "−"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                memoizedOnClose();
              }}
              aria-label="Close panel"
              className="inline-flex items-center justify-center w-9 h-9 text-lg font-bold text-foreground hover:text-destructive hover:bg-destructive/20 rounded-md transition-all duration-200 hover:scale-110"
              title="Close panel"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content - flex column so module root can fill and render correctly */}
      {!panelState.isMinimized && (
        <div
          className="flex-1 min-h-0 min-h-[280px] flex flex-col overflow-hidden rounded-b-lg"
          onMouseDown={() => {
            memoizedOnFocus();
          }}
        >
          <div
            className="flex-1 min-h-0 min-h-[260px] overflow-auto flex flex-col"
            style={{
              minHeight: Math.max(260, (panelState.size?.height ?? 450) - 52),
            }}
          >
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center flex-1 min-h-0 p-6">
                  <div className="mb-4">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-foreground/60">
                    Loading {panelState.entry.title}…
                  </p>
                </div>
              }
            >
              <div
                className="flex flex-col flex-1 min-h-0 min-h-[180px] w-full"
                style={{
                  minHeight: Math.max(180, (panelState.size?.height ?? 450) - 52),
                  height: Math.max(180, (panelState.size?.height ?? 450) - 52),
                  backgroundColor: "var(--background, #0f172a)",
                }}
              >
                <PanelContentErrorBoundary panelKey={panelKey} panelTitle={panelState.entry.title}>
                  <PanelRenderDiagnostic
                    panelKey={panelKey}
                    panelTitle={panelState.entry.title}
                    enabled={typeof window !== "undefined" && (import.meta.env?.DEV || new URLSearchParams(window.location.search).get("panelDebug") === "1")}
                  >
                    {panelState.entry.element}
                  </PanelRenderDiagnostic>
                </PanelContentErrorBoundary>
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Resize Handles - 8 points (4 corners + 4 edges) - disabled for sticky notes */}
      {!panelState.isMinimized && !isStickyNote && (
        <>
          {/* Corner Handles */}
          {/* Top-Left */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 left-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-nw-resize transition-colors"
            title="Resize (top-left)"
            style={{ borderRadius: "2px 0 8px 0" }}
          />
          {/* Top-Right */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 right-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-ne-resize transition-colors"
            title="Resize (top-right)"
            style={{ borderRadius: "0 2px 0 8px" }}
          />
          {/* Bottom-Left */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 left-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-sw-resize transition-colors"
            title="Resize (bottom-left)"
            style={{ borderRadius: "8px 0 0 2px" }}
          />
          {/* Bottom-Right */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-se-resize transition-colors"
            title="Resize (bottom-right)"
            style={{ borderRadius: "0 8px 2px 0" }}
          />

          {/* Edge Handles */}
          {/* Top */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 left-0 right-0 h-3 hover:bg-primary/60 cursor-ns-resize transition-colors"
            title="Resize (top)"
            style={{
              background:
                hoverEdge === "n" ? "rgba(59, 130, 246, 0.6)" : "transparent",
            }}
          />
          {/* Bottom */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 left-0 right-0 h-3 hover:bg-primary/60 cursor-ns-resize transition-colors"
            title="Resize (bottom)"
            style={{
              background:
                hoverEdge === "s" ? "rgba(59, 130, 246, 0.6)" : "transparent",
            }}
          />
          {/* Left */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 bottom-0 left-0 w-3 hover:bg-primary/50 cursor-ew-resize transition-colors"
            title="Resize (left)"
            style={{
              background:
                hoverEdge === "w" ? "rgba(59, 130, 246, 0.5)" : "transparent",
            }}
          />
          {/* Right */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 bottom-0 right-0 w-3 hover:bg-primary/50 cursor-ew-resize transition-colors"
            title="Resize (right)"
            style={{
              background:
                hoverEdge === "e" ? "rgba(59, 130, 246, 0.5)" : "transparent",
            }}
          />
        </>
      )}
    </div>
  );
});

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

  const closeAllPanels = useCallback(() => setPanels({}), []);

  // Open panel function - called from dock or open-panel events
  const openPanel = (
    id: PanelId,
    tab?: string,
    panelProps?: Record<string, any>,
  ) => {
    console.log("[PanelHost.openPanel] Opening panel:", id, {
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
        id === "whiteboard" ||
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

            // Add new panel (wrap in error boundary so throws show a message instead of blank)
            const suspenseFallback = (
              <div className="p-6 text-foreground/60">
                Loading {metadata.label}…
              </div>
            );
            const PanelContent = diag.isEnabled()
              ? withDiagTracking(Component, panelKey)
              : Component;
            const element = diag.isEnabled() ? (
              <DiagErrorBoundary moduleId={panelKey}>
                <Suspense fallback={suspenseFallback}>
                  <PanelContent {...panelProps} />
                </Suspense>
              </DiagErrorBoundary>
            ) : (
              <PanelContentErrorBoundary panelKey={panelKey} panelTitle={metadata.label}>
                <Suspense fallback={suspenseFallback}>
                  <Component {...panelProps} />
                </Suspense>
              </PanelContentErrorBoundary>
            );
            return {
              ...panels,
              [panelKey]: {
                entry: {
                  id: panelKey,
                  title: metadata.label,
                  panelKey: id,
                  element,
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
              const sentryModule = await import("@/sentry-init");
              const Sentry = sentryModule.Sentry || (sentryModule as any).default?.Sentry;
              if (Sentry && typeof Sentry.captureException === "function") {
                Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
                  tags: {
                    panel: String(id),
                    errorType: "panel_load_failure",
                  },
                  contexts: {
                    panel: {
                      id: String(id),
                      panelKey: String(id),
                      metadata: metadata ? JSON.stringify(metadata) : undefined,
                    },
                  },
                });
              }
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
            defaultWidth: 700,
            defaultHeight: 550,
            icon: "",
            title: "Dashboard",
          },
          element: (
            <Suspense
              fallback={
                <div className="p-6 text-foreground/60">Loading Dashboard…</div>
              }
            >
              <RestaurantDashboard />
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
        whiteboard: {
          metadata: {
            defaultWidth: 900,
            defaultHeight: 650,
            icon: "✏️",
            title: "Whiteboard",
          },
          element: (
            <Suspense
              fallback={
                <div className="p-6 text-foreground/60">
                  Loading Whiteboard…
                </div>
              }
            >
              <WhiteboardModule />
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
              const icon =
                (metadataIcon && metadataIcon.startsWith("http")
                  ? metadataIcon
                  : undefined) ||
                panel?.entry.icon ||
                metadataIcon ||
                "📦";
              const isImageIcon =
                panel?.entry.isImageIcon ?? icon.startsWith("http");

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
      window.removeEventListener("restore-panel", handleRestorePanel);
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
            const icon =
              (metadataIcon && metadataIcon.startsWith("http")
                ? metadataIcon
                : undefined) ||
              panelEntry?.icon ||
              metadataIcon ||
              "📦";
            const isImageIcon =
              panelEntry?.isImageIcon ?? icon.startsWith("http");

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
            setPanels((prev) => ({
              ...prev,
              [panelId]: {
                ...prev[panelId as PanelId],
                size: newSize,
              },
            }));
          }}
          onPositionChange={(newPosition) => {
            setPanels((prev) => ({
              ...prev,
              [panelId]: {
                ...prev[panelId as PanelId],
                position: newPosition,
              },
            }));

            // Persist sticky note positions to localStorage
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
