import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
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
  CustomWidgetBuilder,
  type CustomWidget,
} from "@/components/dashboard/CustomWidgetBuilder";
import LanguageSelect from "./LanguageSelect";

export interface SettingsPanelProps {
  initialTab?:
    | "avatar"
    | "theme"
    | "language"
    | "developer"
    | "sticky-notes"
    | "toolbar"
    | "mini-panels"
    | "custom-widgets"
    | "dashboard-widgets";
}

export function SettingsPanel({ initialTab = "avatar" }: SettingsPanelProps) {
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
    | "dashboard-widgets"
  >(initialTab as any);
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
    setActiveTab(initialTab as any);
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
                icon: "📱",
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
                  setActiveTab(item.id as any);
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

export default SettingsPanel;
