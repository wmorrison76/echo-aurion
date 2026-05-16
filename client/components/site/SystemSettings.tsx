import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Palette,
  Bell,
  Languages,
  Lock,
  User,
  Info,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Clock,
  Accessibility,
  Eye,
  Volume2,
  Zap,
  Keyboard,
  Slack,
  Package,
  Grid3x3,
  Cpu,
  BarChart3,
  Coffee,
  Layers,
  Download,
  UserCircle,
  Flame,
  Shield,
  Activity,
  LayoutDashboard,
  Link2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AvatarSelector from "./AvatarSelector";
import EcosystemControlPanel from "../admin/EcosystemControlPanel";
import EnhancedAppearanceSettings from "./EnhancedAppearanceSettings";
import DeviceEnrollment from "./DeviceEnrollment";

type ColorScheme = "cyan" | "blue" | "emerald" | "violet" | "rose";
type ThemeMode = "light" | "dark" | "system";

const COLORS: Array<{ id: ColorScheme; label: string; icon: React.ReactNode }> =
  [
    { id: "cyan", label: "Cyan", icon: "🔵" },
    { id: "blue", label: "Blue", icon: "🔷" },
    { id: "emerald", label: "Emerald", icon: "💚" },
    { id: "violet", label: "Violet", icon: "💜" },
    { id: "rose", label: "Rose", icon: "🌹" },
  ];

const SETTINGS_SECTIONS = [
  { id: "avatar", label: "Avatar", icon: UserCircle },
  { id: "general", label: "General", icon: Monitor },
  // iter262 · Appearance nav removed — theme is a single global toggle.
  // { id: "appearance", label: "Appearance", icon: Palette },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "device-enrollment", label: "Device Enrollment", icon: Download },
  { id: "ekg", label: "EKG Monitor", icon: Activity },
  { id: "trace-viewer", label: "Trace Viewer", icon: Link2 },
  { id: "module-status", label: "Module Status", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "schedule", label: "Schedule", icon: Clock },
  { id: "culinary", label: "Culinary & Recipes", icon: Coffee },
  { id: "workspace", label: "Workspace", icon: Grid3x3 },
  { id: "keyboard", label: "Keyboard & Shortcuts", icon: Keyboard },
  { id: "integrations", label: "Integrations", icon: Slack },
  { id: "performance", label: "Performance", icon: Zap },
  { id: "language", label: "Language & Region", icon: Languages },
  { id: "privacy", label: "Privacy & Security", icon: Lock },
  { id: "profile", label: "Profile", icon: User },
  { id: "admin", label: "Admin Controls", icon: Shield },
  { id: "about", label: "About", icon: Info },
];

interface PreferencesState {
  general: {
    autoSave: boolean;
    autoBackup: boolean;
    checkUpdates: boolean;
    backupFrequency: "daily" | "weekly" | "monthly";
  };
  notifications: {
    desktop: boolean;
    email: boolean;
    inApp: boolean;
    doNotDisturb: boolean;
    scheduleNotifications: boolean;
    culinaryAlerts: boolean;
    purchasingAlerts: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    fontSize: "small" | "normal" | "large";
    fontScale: number; // 0.8 to 1.5 (mirrors Appearance)
  };
  schedule: {
    timeFormat: "12h" | "24h";
    weekStartDay: "sunday" | "monday";
    defaultShiftDuration: number;
    overtimeThreshold: number;
    payPeriodStart: "monday" | "custom";
  };
  culinary: {
    defaultRecipeLayout: "grid" | "list";
    autosaveRecipes: boolean;
    ingredientUnits: "metric" | "imperial" | "both";
    exportFormat: "pdf" | "word" | "csv";
    defaultServings: number;
  };
  workspace: {
    defaultModule: "dashboard" | "schedule" | "culinary" | "purchasing";
    sidebarPosition: "left" | "right";
    sidebarAutoHide: boolean;
    pinFavoriteModules: boolean;
    rememberLastView: boolean;
    widgetLayout: "auto" | "custom";
  };
  keyboard: {
    enableShortcuts: boolean;
    customShortcuts: Record<string, string>;
    searchShortcut: string;
    settingsShortcut: string;
  };
  integrations: {
    slackEnabled: boolean;
    googleCalendarEnabled: boolean;
    microsoftTeamsEnabled: boolean;
    webhooksEnabled: boolean;
  };
  performance: {
    hardwareAcceleration: boolean;
    maxBackgroundTabs: number;
    enableCaching: boolean;
    preloadModules: boolean;
    offlineMode: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    usageTracking: boolean;
  };
}

const DEFAULT_PREFERENCES: PreferencesState = {
  general: {
    autoSave: true,
    autoBackup: true,
    checkUpdates: true,
    backupFrequency: "daily",
  },
  notifications: {
    desktop: true,
    email: true,
    inApp: true,
    doNotDisturb: false,
    scheduleNotifications: true,
    culinaryAlerts: true,
    purchasingAlerts: true,
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    fontSize: "normal",
    fontScale: 1.0,
  },
  schedule: {
    timeFormat: "12h",
    weekStartDay: "monday",
    defaultShiftDuration: 8,
    overtimeThreshold: 40,
    payPeriodStart: "monday",
  },
  culinary: {
    defaultRecipeLayout: "grid",
    autosaveRecipes: true,
    ingredientUnits: "imperial",
    exportFormat: "pdf",
    defaultServings: 4,
  },
  workspace: {
    defaultModule: "dashboard",
    sidebarPosition: "left",
    sidebarAutoHide: false,
    pinFavoriteModules: true,
    rememberLastView: true,
    widgetLayout: "auto",
  },
  keyboard: {
    enableShortcuts: true,
    customShortcuts: {},
    searchShortcut: "Cmd+K",
    settingsShortcut: "Cmd+,",
  },
  integrations: {
    slackEnabled: false,
    googleCalendarEnabled: false,
    microsoftTeamsEnabled: false,
    webhooksEnabled: false,
  },
  performance: {
    hardwareAcceleration: true,
    maxBackgroundTabs: 5,
    enableCaching: true,
    preloadModules: true,
    offlineMode: false,
  },
  privacy: {
    analytics: true,
    crashReports: true,
    usageTracking: true,
  },
};

export default function SystemSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState("avatar");
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("Echo_B");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarHandleRef = useRef<HTMLButtonElement | null>(null);
  const sidebarCollapseTimerRef = useRef<number | null>(null);
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useI18n();

  const closeSettings = () => {
    setIsOpen(false);
    setSidebarCollapsed(false);
    if (sidebarCollapseTimerRef.current) {
      window.clearTimeout(sidebarCollapseTimerRef.current);
      sidebarCollapseTimerRef.current = null;
    }
    window.dispatchEvent(new CustomEvent("settings-closed"));
  };

  const collapseSidebarSoon = () => {
    if (sidebarCollapseTimerRef.current) {
      window.clearTimeout(sidebarCollapseTimerRef.current);
    }

    sidebarCollapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      sidebarCollapseTimerRef.current = null;
    }, 125);
  };

  const handleSelectSection = (sectionId: string) => {
    setSelectedSection(sectionId);
    if (sidebarCollapseTimerRef.current) {
      window.clearTimeout(sidebarCollapseTimerRef.current);
      sidebarCollapseTimerRef.current = null;
    }
    setSidebarCollapsed(true);
  };

  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem("colorScheme") as ColorScheme | null;
    return stored || "cyan";
  });

  const [preferences, setPreferences] =
    useState<PreferencesState>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setMounted(true);
    // Load avatar from localStorage
    const saved = localStorage.getItem("user-avatar") || "Echo_B";
    setSelectedAvatar(saved);

    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem("system-preferences");
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (e) {
        console.error("Failed to load preferences:", e);
      }
    }
  }, []);

  // Listen for settings panel open event
  useEffect(() => {
    const handleOpenSettings = (event: any) => {
      // Only open if event is explicitly triggered (not from page load)
      if (event.detail?.autoOpen !== true) {
        setIsOpen(true);
        setSidebarCollapsed(false);
        const section = event.detail?.tab || "avatar";
        setSelectedSection(section);
      }
    };

    window.addEventListener(
      "open-settings",
      handleOpenSettings as EventListener,
    );
    return () => {
      window.removeEventListener(
        "open-settings",
        handleOpenSettings as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeSettings();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSidebarCollapsed(false);
      if (sidebarCollapseTimerRef.current) {
        window.clearTimeout(sidebarCollapseTimerRef.current);
        sidebarCollapseTimerRef.current = null;
      }
      return;
    }

    const clearCollapseTimer = () => {
      if (sidebarCollapseTimerRef.current) {
        window.clearTimeout(sidebarCollapseTimerRef.current);
        sidebarCollapseTimerRef.current = null;
      }
    };

    const scheduleCollapse = () => {
      clearCollapseTimer();
      sidebarCollapseTimerRef.current = window.setTimeout(() => {
        setSidebarCollapsed(true);
        sidebarCollapseTimerRef.current = null;
      }, 125);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const insideSidebar = sidebarRef.current?.contains(target) ?? false;
      const insideHandle = sidebarHandleRef.current?.contains(target) ?? false;
      if (!insideSidebar && !insideHandle) {
        scheduleCollapse();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clearCollapseTimer();
      setSidebarCollapsed(true);
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearCollapseTimer();
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  // Listen for font scale changes from Appearance settings
  useEffect(() => {
    const handleFontScaleChanged = (event: any) => {
      const fontScale = event.detail?.fontScale;
      if (fontScale !== undefined) {
        setPreferences((prev) => ({
          ...prev,
          accessibility: {
            ...prev.accessibility,
            fontScale: fontScale,
          },
        }));
      }
    };

    const handleHighContrastChanged = (event: any) => {
      const highContrast = event.detail?.highContrast;
      if (highContrast !== undefined) {
        setPreferences((prev) => ({
          ...prev,
          accessibility: {
            ...prev.accessibility,
            highContrast: highContrast,
          },
        }));
      }
    };

    window.addEventListener(
      "appearance-font-scale-changed",
      handleFontScaleChanged as EventListener,
    );
    window.addEventListener(
      "appearance-high-contrast-changed",
      handleHighContrastChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        "appearance-font-scale-changed",
        handleFontScaleChanged as EventListener,
      );
      window.removeEventListener(
        "appearance-high-contrast-changed",
        handleHighContrastChanged as EventListener,
      );
    };
  }, []);

  const handleColorChange = (newScheme: ColorScheme) => {
    setColorScheme(newScheme);
    const htmlElement = document.documentElement;
    COLORS.forEach(({ id }) => {
      htmlElement.classList.remove(`theme-${id}`);
    });
    htmlElement.classList.add(`theme-${newScheme}`);
    localStorage.setItem("colorScheme", newScheme);

    // Dispatch event for other components
    window.dispatchEvent(
      new CustomEvent("preferences-changed", {
        detail: { colorScheme: newScheme },
      }),
    );
  };

  const handlePreferenceChange = (
    category: string,
    key: string,
    value: any,
  ) => {
    const updated = {
      ...preferences,
      [category]: {
        ...(preferences[category as keyof PreferencesState] || {}),
        [key]: value,
      },
    };
    setPreferences(updated as PreferencesState);
    localStorage.setItem("system-preferences", JSON.stringify(updated));

    // Dispatch event for other components to listen
    window.dispatchEvent(
      new CustomEvent("preferences-changed", {
        detail: { category, key, value },
      }),
    );
  };

  const filteredSections = SETTINGS_SECTIONS.filter((section) =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleExportSettings = () => {
    const data = {
      preferences,
      colorScheme,
      theme,
      lang,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luccca-preferences-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToDefaults = () => {
    if (
      confirm("Are you sure? This will reset all settings to their defaults.")
    ) {
      setPreferences(DEFAULT_PREFERENCES);
      localStorage.setItem(
        "system-preferences",
        JSON.stringify(DEFAULT_PREFERENCES),
      );
      setColorScheme("cyan");
      handleColorChange("cyan");
      window.dispatchEvent(new CustomEvent("preferences-reset"));
    }
  };

  return (
    <>
      {/* Main Settings Window */}
      <div
        className={cn(
          "fixed inset-0 z-[99999]",
          "flex items-start justify-start p-4 sm:p-5 lg:p-6",
          "transition-opacity duration-300",
          isOpen && mounted
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
          onClick={closeSettings}
        />

        {/* Settings Window */}
        <div
          className={cn(
            "relative isolate overflow-hidden",
            "flex h-[calc(100vh-2rem)] w-[min(96vw,1280px)] max-h-[calc(100vh-2rem)] max-w-[1280px] flex-col",
            "rounded-[30px] border border-white/10",
            "bg-[linear-gradient(135deg,rgba(8,10,18,0.98),rgba(14,16,30,0.96)_45%,rgba(22,14,43,0.96))]",
            "shadow-[0_36px_140px_rgba(2,6,23,0.78)] ring-1 ring-white/5",
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.10),transparent_30%)]" />
          <button
            type="button"
            aria-label="Close settings"
            className="absolute right-5 top-5 z-20 rounded-full border border-white/10 bg-white/5 p-2 text-white/60 shadow-lg backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white"
            onClick={closeSettings}
          >
            <X size={18} />
          </button>

          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.14)]">
                <Coffee size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">EchoStratus</p>
                <p className="text-xs text-white/60">Director/Executive Financial Brain</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 md:block">
              Culinary-style settings
            </div>
          </div>

          <div className="relative flex flex-1 min-h-0 overflow-hidden p-4">
            {/* Sidebar */}
            <div
              ref={sidebarRef}
              className={cn(
                "fixed left-4 top-4 bottom-4 z-[10000] overflow-visible rounded-[30px] border border-white/10 backdrop-blur-[18px] transition-all duration-[125ms] ease-out pt-4",
                "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_20px_50px_rgba(2,6,23,0.28)] ring-1 ring-white/6",
                sidebarCollapsed || !isOpen ? "w-0 opacity-0 pointer-events-none" : "w-[176px] opacity-100 pointer-events-auto",
              )}
            onMouseEnter={() => {
              if (sidebarCollapseTimerRef.current) {
                window.clearTimeout(sidebarCollapseTimerRef.current);
                sidebarCollapseTimerRef.current = null;
              }
              setSidebarCollapsed(false);
            }}
            onMouseLeave={() => {
              if (!isOpen) return;
              collapseSidebarSoon();
            }}
          >
            <button
              ref={sidebarHandleRef}
              type="button"
              aria-label={sidebarCollapsed ? "Expand settings sidebar" : "Collapse settings sidebar"}
              aria-expanded={!sidebarCollapsed}
              aria-pressed={!sidebarCollapsed}
              title={sidebarCollapsed ? "Expand settings sidebar" : "Collapse settings sidebar"}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={cn(
                "absolute -right-5 top-1/2 z-[1000] hidden h-16 w-8 -translate-y-1/2 items-center justify-center border border-white/10 bg-[linear-gradient(180deg,rgba(30,21,53,0.96),rgba(12,14,24,0.96))] px-1.5 py-4 text-cyan-200 shadow-[0_16px_50px_rgba(2,6,23,0.55)] backdrop-blur-2xl transition-transform duration-200 hover:scale-105 hover:border-cyan-300/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:flex",
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "block h-4 w-0.5 rounded-full bg-current transition-all duration-200",
                    sidebarCollapsed ? "translate-y-0 rotate-0" : "-translate-y-[3px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "block h-4 w-0.5 rounded-full bg-current transition-all duration-200",
                    sidebarCollapsed ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
                  )}
                />
                <span
                  className={cn(
                    "block h-4 w-0.5 rounded-full bg-current transition-all duration-200",
                    sidebarCollapsed ? "translate-y-0 rotate-0" : "translate-y-[3px] -rotate-45",
                  )}
                />
              </div>
            </button>

            <div className={cn("pl-[25px] pr-4 pb-3", sidebarCollapsed && "hidden")} />

            {/* Search Bar */}
            <div
              className={cn(
                "sticky top-0 z-10 border-b border-white/10 bg-[#0e1220]/80 backdrop-blur-xl transition-all duration-300",
                sidebarCollapsed ? "pointer-events-none max-h-0 overflow-hidden p-0 opacity-0" : "pl-[25px] pr-4 py-3 opacity-100",
              )}
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 py-2 text-sm glass-input"
                />
              </div>
            </div>

            {/* Navigation Items */}
            <nav className={cn("space-y-1 pl-[25px] pr-3 pb-4 transition-all duration-[125ms]", sidebarCollapsed && "hidden") }>
              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSelectSection(section.id)}
                    title={sidebarCollapsed ? section.label : undefined}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-full text-sm font-medium transition-all duration-200",
                      "flex items-center gap-3 border border-transparent",
                      sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                      selectedSection === section.id
                        ? "border-cyan-300/15 bg-white/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                        : "text-white/60 hover:border-white/10 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span
                      className={cn(
                        "flex-1 text-left transition-all duration-200",
                        sidebarCollapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100",
                      )}
                    >
                      {section.label}
                    </span>
                    {selectedSection === section.id && !sidebarCollapsed && (
                      <ChevronRight size={16} className="shrink-0 text-cyan-200" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

            {/* Main Content Area */}
            <div className="relative z-0 flex-1 flex flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,21,0.96),rgba(9,11,20,0.98))] shadow-[0_28px_90px_rgba(2,6,23,0.34)] ring-1 ring-white/5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-5 backdrop-blur-xl">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-semibold tracking-tight text-white">
                    {SETTINGS_SECTIONS.find((s) => s.id === selectedSection)
                      ?.label || "Settings"}
                  </h2>
                  <p className="text-xs text-white/50">Culinary-inspired control surface</p>
                </div>
                <button
                  onClick={closeSettings}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8">
                {selectedSection === "avatar" && (
                  <>
                    <AvatarSelector
                      selectedAvatar={selectedAvatar}
                      onAvatarSelect={(avatarId) => {
                        setSelectedAvatar(avatarId);
                        localStorage.setItem("user-avatar", avatarId);
                        window.dispatchEvent(new Event("avatar-changed"));
                      }}
                    />
                  </>
                )}

              {selectedSection === "general" && (
                <>
                  <SettingSection title="General">
                    <SettingItem
                      label="Auto-Save"
                      description="Automatically save changes"
                      type="toggle"
                      value={preferences.general.autoSave}
                      onChange={(v) =>
                        handlePreferenceChange("general", "autoSave", v)
                      }
                    />
                    <SettingItem
                      label="Auto-Backup"
                      description="Automatically backup data"
                      type="toggle"
                      value={preferences.general.autoBackup}
                      onChange={(v) =>
                        handlePreferenceChange("general", "autoBackup", v)
                      }
                    />
                    <SettingItem
                      label="Check for Updates"
                      description="Automatically check for new versions"
                      type="toggle"
                      value={preferences.general.checkUpdates}
                      onChange={(v) =>
                        handlePreferenceChange("general", "checkUpdates", v)
                      }
                    />
                    <div className="pt-3 border-t border-border/10">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Backup Frequency
                      </label>
                      <div className="flex gap-2">
                        {["daily", "weekly", "monthly"].map((freq) => (
                          <button
                            key={freq}
                            onClick={() =>
                              handlePreferenceChange(
                                "general",
                                "backupFrequency",
                                freq,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm capitalize transition-all border-2",
                              preferences.general.backupFrequency === freq
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>
                  </SettingSection>
                </>
              )}

              {/* iter262 · Appearance section removed — theme is controlled by the
                  single sun/moon icon in the top-right of the shell. If accessibility
                  options are later needed (font scale, high contrast), they can be
                  added to the "Preferences" section instead. */}

              {selectedSection === "dashboard" && (
                <SettingSection title="System Dashboard">
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-panel", { detail: { id: "dashboard" } })
                        );
                        setIsOpen(false);
                      }}
                      className="w-full glass-button bg-primary/20 hover:bg-primary/30 text-primary"
                    >
                      <LayoutDashboard size={16} className="mr-2" />
                      Open Dashboard Panel
                    </Button>
                    <p className="text-xs text-foreground/60">
                      View real-time system metrics, operational overviews, and key performance indicators.
                    </p>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "device-enrollment" && (
                <SettingSection title="Device Enrollment">
                  <DeviceEnrollment />
                </SettingSection>
              )}

              {selectedSection === "ekg" && (
                <SettingSection title="EKG Monitor">
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-panel", { detail: { id: "ekg" } })
                        );
                        setIsOpen(false);
                      }}
                      className="w-full glass-button bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400"
                    >
                      <Activity size={16} className="mr-2" />
                      Open EKG Monitor
                    </Button>
                    <p className="text-xs text-foreground/60">
                      Monitor system health, heartbeat signals, and critical infrastructure status.
                    </p>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "trace-viewer" && (
                <SettingSection title="Trace Viewer">
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-panel", { detail: { id: "trace-viewer" } })
                        );
                        setIsOpen(false);
                      }}
                      className="w-full glass-button bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400"
                    >
                      <Link2 size={16} className="mr-2" />
                      Open Trace Viewer
                    </Button>
                    <p className="text-xs text-foreground/60">
                      Analyze system traces, execution paths, and transaction history.
                    </p>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "module-status" && (
                <SettingSection title="Module Status">
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-panel", { detail: { id: "module-status" } })
                        );
                        setIsOpen(false);
                      }}
                      className="w-full glass-button bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    >
                      <Activity size={16} className="mr-2" />
                      Open Module Status
                    </Button>
                    <p className="text-xs text-foreground/60">
                      Check the health and uptime of individual system modules and services.
                    </p>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "notifications" && (
                <SettingSection title="Notification Preferences">
                  <SettingItem
                    label="Desktop Notifications"
                    description="Show notifications on desktop"
                    type="toggle"
                    value={preferences.notifications.desktop}
                    onChange={(v) => {
                      handlePreferenceChange("notifications", "desktop", v);
                      // Request permission if enabling
                      if (v && "Notification" in window) {
                        Notification.requestPermission().then((permission) => {
                          if (permission === "granted") {
                            toast.success("Desktop notifications enabled");
                          } else {
                            toast.error("Desktop notifications permission denied");
                            handlePreferenceChange("notifications", "desktop", false);
                          }
                        });
                      }
                    }}
                  />
                  <SettingItem
                    label="Email Notifications"
                    description="Receive notifications via email"
                    type="toggle"
                    value={preferences.notifications.email}
                    onChange={(v) => {
                      handlePreferenceChange("notifications", "email", v);
                      toast.success(
                        v
                          ? "Email notifications enabled"
                          : "Email notifications disabled",
                      );
                    }}
                  />
                  <SettingItem
                    label="In-App Notifications"
                    description="Show notifications in app"
                    type="toggle"
                    value={preferences.notifications.inApp}
                    onChange={(v) => {
                      handlePreferenceChange("notifications", "inApp", v);
                      // Dispatch event for notification system
                      window.dispatchEvent(
                        new CustomEvent("notification-preference-changed", {
                          detail: { inApp: v },
                        }),
                      );
                      toast.success(
                        v
                          ? "In-app notifications enabled"
                          : "In-app notifications disabled",
                      );
                    }}
                  />
                  <SettingItem
                    label="Do Not Disturb"
                    description="Silence all notifications"
                    type="toggle"
                    value={preferences.notifications.doNotDisturb}
                    onChange={(v) => {
                      handlePreferenceChange("notifications", "doNotDisturb", v);
                      // Dispatch event for notification system
                      window.dispatchEvent(
                        new CustomEvent("notification-preference-changed", {
                          detail: { doNotDisturb: v },
                        }),
                      );
                      toast.success(
                        v
                          ? "Do Not Disturb enabled - all notifications silenced"
                          : "Do Not Disturb disabled",
                      );
                    }}
                  />
                  <div className="pt-3 border-t border-border/10">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Module-Specific Alerts
                    </p>
                    <SettingItem
                      label="Schedule Notifications"
                      description="Get notified of schedule changes"
                      type="toggle"
                      value={preferences.notifications.scheduleNotifications}
                      onChange={(v) =>
                        handlePreferenceChange(
                          "notifications",
                          "scheduleNotifications",
                          v,
                        )
                      }
                    />
                    <SettingItem
                      label="Culinary Alerts"
                      description="Recipe updates and inventory alerts"
                      type="toggle"
                      value={preferences.notifications.culinaryAlerts}
                      onChange={(v) =>
                        handlePreferenceChange(
                          "notifications",
                          "culinaryAlerts",
                          v,
                        )
                      }
                    />
                    <SettingItem
                      label="Purchasing Alerts"
                      description="PO approvals and receiving notifications"
                      type="toggle"
                      value={preferences.notifications.purchasingAlerts}
                      onChange={(v) =>
                        handlePreferenceChange(
                          "notifications",
                          "purchasingAlerts",
                          v,
                        )
                      }
                    />
                  </div>
                </SettingSection>
              )}

              {selectedSection === "accessibility" && (
                <SettingSection title="Accessibility">
                  <SettingItem
                    label="Reduce Motion"
                    description="Minimize animations and transitions"
                    type="toggle"
                    value={preferences.accessibility.reduceMotion}
                    onChange={(v) => {
                      handlePreferenceChange("accessibility", "reduceMotion", v);
                      // Apply reduce motion immediately
                      if (v) {
                        document.documentElement.classList.add("reduce-motion");
                        document.documentElement.style.setProperty("--motion-reduce", "1");
                      } else {
                        document.documentElement.classList.remove("reduce-motion");
                        document.documentElement.style.removeProperty("--motion-reduce");
                      }
                      // Dispatch event for other components
                      window.dispatchEvent(
                        new CustomEvent("preferences-changed", {
                          detail: { category: "accessibility", key: "reduceMotion", value: v },
                        }),
                      );
                    }}
                  />
                  <SettingItem
                    label="High Contrast"
                    description="Maximize brightness difference for improved readability"
                    type="toggle"
                    value={preferences.accessibility.highContrast}
                    onChange={(v) => {
                      handlePreferenceChange(
                        "accessibility",
                        "highContrast",
                        v,
                      );
                      // Also update Appearance settings
                      import("@/lib/theme-manager").then(
                        ({ applyHighContrast }) => {
                          applyHighContrast(v);
                        },
                      );
                    }}
                  />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Text Size
                      </label>
                      <div className="flex gap-2">
                        {(["small", "normal", "large"] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              handlePreferenceChange(
                                "accessibility",
                                "fontSize",
                                size,
                              );
                              // Apply font size immediately
                              const root = document.documentElement;
                              root.classList.remove("font-size-small", "font-size-normal", "font-size-large");
                              root.classList.add(`font-size-${size}`);
                              // Also sync with Appearance font scale
                              const scaleMap = { small: 0.875, normal: 1.0, large: 1.125 };
                              import("@/lib/theme-manager").then(({ applyFontScale }) => {
                                applyFontScale(scaleMap[size]);
                              });
                            }}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm capitalize transition-all",
                              "border-2",
                              preferences.accessibility.fontSize === size
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {size === "small" && "Small"}
                            {size === "normal" && "Normal"}
                            {size === "large" && "Large"}
                          </button>
                        ))}
                      </div>
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-4">
                      Font Scale (mirrors Appearance settings)
                    </label>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        80%
                      </span>
                      <input
                        type="range"
                        min="0.8"
                        max="1.5"
                        step="0.1"
                        value={preferences.accessibility.fontScale || 1.0}
                        onChange={(e) => {
                          const scale = parseFloat(e.target.value);
                          handlePreferenceChange(
                            "accessibility",
                            "fontScale",
                            scale,
                          );
                          // Also update Appearance font scale via theme manager
                          import("@/lib/theme-manager").then(
                            ({ applyFontScale }) => {
                              applyFontScale(scale);
                            },
                          );
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        150%
                      </span>
                    </div>
                    <div className="text-center mt-3">
                      <p className="text-sm font-semibold text-foreground">
                        {Math.round(
                          (preferences.accessibility.fontScale || 1.0) * 100,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "schedule" && (
                <SettingSection title="Schedule Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Time Format
                      </label>
                      <div className="flex gap-2">
                        {["12h", "24h"].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() =>
                              handlePreferenceChange(
                                "schedule",
                                "timeFormat",
                                fmt,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm transition-all border-2",
                              preferences.schedule.timeFormat === fmt
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Week Starts On
                      </label>
                      <div className="flex gap-2">
                        {["sunday", "monday"].map((day) => (
                          <button
                            key={day}
                            onClick={() =>
                              handlePreferenceChange(
                                "schedule",
                                "weekStartDay",
                                day,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm capitalize transition-all border-2",
                              preferences.schedule.weekStartDay === day
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Default Shift Duration (hours)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={preferences.schedule.defaultShiftDuration}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "schedule",
                            "defaultShiftDuration",
                            parseInt(e.target.value),
                          )
                        }
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Overtime Threshold (hours/week)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={preferences.schedule.overtimeThreshold}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "schedule",
                            "overtimeThreshold",
                            parseInt(e.target.value),
                          )
                        }
                        className="glass-input"
                      />
                    </div>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "culinary" && (
                <SettingSection title="Culinary & Recipe Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Recipe Layout
                      </label>
                      <div className="flex gap-2">
                        {["grid", "list"].map((layout) => (
                          <button
                            key={layout}
                            onClick={() =>
                              handlePreferenceChange(
                                "culinary",
                                "defaultRecipeLayout",
                                layout,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm capitalize transition-all border-2",
                              preferences.culinary.defaultRecipeLayout ===
                                layout
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {layout}
                          </button>
                        ))}
                      </div>
                    </div>

                    <SettingItem
                      label="Autosave Recipes"
                      description="Save recipe changes automatically"
                      type="toggle"
                      value={preferences.culinary.autosaveRecipes}
                      onChange={(v) =>
                        handlePreferenceChange("culinary", "autosaveRecipes", v)
                      }
                    />

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Ingredient Units
                      </label>
                      <div className="flex gap-2">
                        {["metric", "imperial", "both"].map((units) => (
                          <button
                            key={units}
                            onClick={() =>
                              handlePreferenceChange(
                                "culinary",
                                "ingredientUnits",
                                units,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm capitalize transition-all border-2",
                              preferences.culinary.ingredientUnits === units
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {units}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Export Format
                      </label>
                      <div className="flex gap-2">
                        {["pdf", "word", "csv"].map((format) => (
                          <button
                            key={format}
                            onClick={() =>
                              handlePreferenceChange(
                                "culinary",
                                "exportFormat",
                                format,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm uppercase transition-all border-2",
                              preferences.culinary.exportFormat === format
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Default Servings
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={preferences.culinary.defaultServings}
                        onChange={(e) =>
                          handlePreferenceChange(
                            "culinary",
                            "defaultServings",
                            parseInt(e.target.value),
                          )
                        }
                        className="glass-input"
                      />
                    </div>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "workspace" && (
                <SettingSection title="Workspace & Layout">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Default Module
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "dashboard",
                          "schedule",
                          "culinary",
                          "purchasing",
                        ].map((mod) => (
                          <button
                            key={mod}
                            onClick={() =>
                              handlePreferenceChange(
                                "workspace",
                                "defaultModule",
                                mod,
                              )
                            }
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm capitalize transition-all border-2",
                              preferences.workspace.defaultModule === mod
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/30 hover:border-primary/50",
                            )}
                          >
                            {mod}
                          </button>
                        ))}
                      </div>
                    </div>

                    <SettingItem
                      label="Remember Last View"
                      description="Restore the last module you were viewing"
                      type="toggle"
                      value={preferences.workspace.rememberLastView}
                      onChange={(v) =>
                        handlePreferenceChange(
                          "workspace",
                          "rememberLastView",
                          v,
                        )
                      }
                    />

                    <SettingItem
                      label="Sidebar Auto-Hide"
                      description="Automatically hide sidebar when not in use"
                      type="toggle"
                      value={preferences.workspace.sidebarAutoHide}
                      onChange={(v) =>
                        handlePreferenceChange(
                          "workspace",
                          "sidebarAutoHide",
                          v,
                        )
                      }
                    />

                    <SettingItem
                      label="Pin Favorite Modules"
                      description="Quick access to your most-used modules"
                      type="toggle"
                      value={preferences.workspace.pinFavoriteModules}
                      onChange={(v) =>
                        handlePreferenceChange(
                          "workspace",
                          "pinFavoriteModules",
                          v,
                        )
                      }
                    />
                  </div>
                </SettingSection>
              )}

              {selectedSection === "keyboard" && (
                <SettingSection title="Keyboard & Shortcuts">
                  <SettingItem
                    label="Enable Keyboard Shortcuts"
                    description="Use keyboard shortcuts throughout the app"
                    type="toggle"
                    value={preferences.keyboard.enableShortcuts}
                    onChange={(v) => {
                      handlePreferenceChange("keyboard", "enableShortcuts", v);
                      // Actually enable/disable shortcuts
                      import("@/lib/keyboard-shortcuts").then(
                        ({ globalShortcuts }) => {
                          globalShortcuts.setEnabled(v);
                          localStorage.setItem(
                            "keyboard-shortcuts-enabled",
                            String(v),
                          );
                          toast.success(
                            v
                              ? "Keyboard shortcuts enabled"
                              : "Keyboard shortcuts disabled",
                          );
                        },
                      );
                    }}
                  />

                  <div className="mt-4 pt-4 border-t border-border/10">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Default Shortcuts
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded hover:bg-muted/30 transition-colors">
                        <div>
                          <span className="text-foreground font-medium">
                            Quick Search
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Open the global search dialog
                          </p>
                        </div>
                        <kbd className="px-3 py-1.5 bg-background rounded border border-border/30 font-mono text-xs">
                          {preferences.keyboard.searchShortcut}
                        </kbd>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded hover:bg-muted/30 transition-colors">
                        <div>
                          <span className="text-foreground font-medium">
                            Open Settings
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Open this settings panel
                          </p>
                        </div>
                        <kbd className="px-3 py-1.5 bg-background rounded border border-border/30 font-mono text-xs">
                          {preferences.keyboard.settingsShortcut}
                        </kbd>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded hover:bg-muted/30 transition-colors">
                        <div>
                          <span className="text-foreground font-medium">
                            Save
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Save current work
                          </p>
                        </div>
                        <kbd className="px-3 py-1.5 bg-background rounded border border-border/30 font-mono text-xs">
                          Cmd/Ctrl + S
                        </kbd>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/10">
                      💡 Shortcuts are disabled when typing in input fields
                    </p>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "integrations" && (
                <SettingSection title="Integrations">
                  <SettingItem
                    label="Slack Integration"
                    description="Connect to Slack for notifications"
                    type="toggle"
                    value={preferences.integrations.slackEnabled}
                    onChange={(v) =>
                      handlePreferenceChange("integrations", "slackEnabled", v)
                    }
                  />
                  <SettingItem
                    label="Google Calendar"
                    description="Sync schedules with Google Calendar"
                    type="toggle"
                    value={preferences.integrations.googleCalendarEnabled}
                    onChange={(v) =>
                      handlePreferenceChange(
                        "integrations",
                        "googleCalendarEnabled",
                        v,
                      )
                    }
                  />
                  <SettingItem
                    label="Microsoft Teams"
                    description="Connect to Teams for collaboration"
                    type="toggle"
                    value={preferences.integrations.microsoftTeamsEnabled}
                    onChange={(v) =>
                      handlePreferenceChange(
                        "integrations",
                        "microsoftTeamsEnabled",
                        v,
                      )
                    }
                  />
                  <SettingItem
                    label="Webhooks"
                    description="Enable custom webhooks"
                    type="toggle"
                    value={preferences.integrations.webhooksEnabled}
                    onChange={(v) =>
                      handlePreferenceChange(
                        "integrations",
                        "webhooksEnabled",
                        v,
                      )
                    }
                  />
                </SettingSection>
              )}

              {selectedSection === "performance" && (
                <SettingSection title="Performance">
                  <SettingItem
                    label="Hardware Acceleration"
                    description="Use GPU for rendering"
                    type="toggle"
                    value={preferences.performance.hardwareAcceleration}
                    onChange={(v) =>
                      handlePreferenceChange(
                        "performance",
                        "hardwareAcceleration",
                        v,
                      )
                    }
                  />
                  <SettingItem
                    label="Enable Caching"
                    description="Cache data for faster loading"
                    type="toggle"
                    value={preferences.performance.enableCaching}
                    onChange={(v) =>
                      handlePreferenceChange("performance", "enableCaching", v)
                    }
                  />
                  <SettingItem
                    label="Preload Modules"
                    description="Load modules in background"
                    type="toggle"
                    value={preferences.performance.preloadModules}
                    onChange={(v) =>
                      handlePreferenceChange("performance", "preloadModules", v)
                    }
                  />
                  <SettingItem
                    label="Offline Mode"
                    description="Allow using app without internet"
                    type="toggle"
                    value={preferences.performance.offlineMode}
                    onChange={(v) =>
                      handlePreferenceChange("performance", "offlineMode", v)
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Background Tabs
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={preferences.performance.maxBackgroundTabs}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "performance",
                          "maxBackgroundTabs",
                          parseInt(e.target.value),
                        )
                      }
                      className="glass-input"
                    />
                  </div>
                </SettingSection>
              )}

              {selectedSection === "language" && (
                <SettingSection title="Language & Region">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Language
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["en", "es", "fr", "de"].map((l) => (
                        <button
                          key={l}
                          onClick={() => setLang(l)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm transition-all border-2",
                            lang === l
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border/30 hover:border-primary/50",
                          )}
                        >
                          {l === "en" && "🇺🇸 English"}
                          {l === "es" && "🇪🇸 Español"}
                          {l === "fr" && "🇫🇷 Français"}
                          {l === "de" && "🇩🇪 Deutsch"}
                        </button>
                      ))}
                    </div>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "privacy" && (
                <SettingSection title="Privacy & Security">
                  <SettingItem
                    label="Usage Analytics"
                    description="Help improve the app by sharing usage data"
                    type="toggle"
                    value={preferences.privacy.analytics}
                    onChange={(v) =>
                      handlePreferenceChange("privacy", "analytics", v)
                    }
                  />
                  <SettingItem
                    label="Crash Reports"
                    description="Automatically send crash reports"
                    type="toggle"
                    value={preferences.privacy.crashReports}
                    onChange={(v) =>
                      handlePreferenceChange("privacy", "crashReports", v)
                    }
                  />
                  <SettingItem
                    label="Usage Tracking"
                    description="Track how you use features"
                    type="toggle"
                    value={preferences.privacy.usageTracking}
                    onChange={(v) =>
                      handlePreferenceChange("privacy", "usageTracking", v)
                    }
                  />
                  <div className="pt-4 space-y-2">
                    <Button
                      onClick={handleExportSettings}
                      className="w-full glass-button bg-primary/20 hover:bg-primary/30 text-primary"
                    >
                      <Download size={16} className="mr-2" />
                      Export Settings
                    </Button>
                    <Button
                      onClick={handleResetToDefaults}
                      className="w-full glass-button bg-red-500/20 hover:bg-red-500/30 text-red-600"
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to clear all cache and data? This will:\n\n" +
                              "• Clear browser cache\n" +
                              "• Clear localStorage (except critical settings)\n" +
                              "• Clear sessionStorage\n" +
                              "• Reload the application\n\n" +
                              "This action cannot be undone.",
                          )
                        ) {
                          try {
                            // Clear cache
                            if ("caches" in window) {
                              caches.keys().then((names) => {
                                names.forEach((name) => {
                                  caches.delete(name);
                                });
                              });
                            }
                            
                            // Clear sessionStorage
                            sessionStorage.clear();
                            
                            // Clear most of localStorage (keep critical settings)
                            const criticalKeys = [
                              "luccca-theme-preferences",
                              "user-avatar",
                              "system-preferences",
                            ];
                            const keysToRemove: string[] = [];
                            for (let i = 0; i < localStorage.length; i++) {
                              const key = localStorage.key(i);
                              if (key && !criticalKeys.includes(key)) {
                                keysToRemove.push(key);
                              }
                            }
                            keysToRemove.forEach((key) => localStorage.removeItem(key));
                            
                            toast.success("Cache and data cleared. Reloading...");
                            setTimeout(() => {
                              window.location.reload();
                            }, 1000);
                          } catch (error) {
                            console.error("Error clearing cache:", error);
                            toast.error("Failed to clear cache. Please try again.");
                          }
                        }
                      }}
                      className="w-full glass-button bg-red-500/20 hover:bg-red-500/30 text-red-600"
                    >
                      Clear Cache & Data
                    </Button>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "profile" && (
                <SettingSection title="Profile">
                  <ProfileSettings />
                </SettingSection>
              )}

              {selectedSection === "admin" && (
                <SettingSection title="Admin Controls">
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        setShowAdminPanel(true);
                        setIsOpen(false);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Open Ecosystem Control Panel
                    </Button>
                    <p className="text-sm text-foreground/80">
                      Manage roles, users, modules, and permissions from the
                      control panel.
                    </p>
                    <div className="pt-4 mt-4 border-t border-border/40">
                      <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">
                        Super Admin Only
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("open-panel", { detail: { id: "ekg" } })
                          );
                        }}
                        className="w-full border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2"
                      >
                        <Activity className="w-4 h-4" />
                        EKG Monitor
                      </Button>
                      <p className="text-xs text-foreground/60 mt-1.5">
                        System health monitoring. Not for end users.
                      </p>
                    </div>
                  </div>
                </SettingSection>
              )}

              {selectedSection === "about" && (
                <SettingSection title="About">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                      <span className="text-foreground/60">App Name</span>
                      <span className="text-foreground font-medium">
                        LUCCCA
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                      <span className="text-foreground/60">Version</span>
                      <span className="text-foreground font-medium">2.0.0</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                      <span className="text-foreground/60">Build</span>
                      <span className="text-foreground font-medium">
                        2024.12
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                      <span className="text-foreground/60">License</span>
                      <span className="text-foreground font-medium">
                        Enterprise
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                      <span className="text-foreground/60">
                        Preferences Saved
                      </span>
                      <span className="text-foreground font-medium text-xs">
                        {Math.round(JSON.stringify(preferences).length / 1024)}{" "}
                        KB
                      </span>
                    </div>

                    {/* Capstone Statement */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Flame className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <h4 className="font-semibold text-foreground">
                            The LUCCCA Vision
                          </h4>
                          <p className="text-xs text-foreground/80 leading-relaxed">
                            LUCCCA represents the pinnacle of enterprise
                            hospitality technology—a comprehensive ecosystem
                            built on the foundation of intelligent
                            decision-making, AI-powered insights, and seamless
                            integration. From personalized avatars and real-time
                            scheduling to advanced culinary management and
                            predictive analytics, every feature has been
                            architected to empower teams, enhance guest
                            experiences, and drive operational excellence. This
                            platform integrates AI cognition engines, workforce
                            optimization, financial programming, and
                            collaborative decision-making into a unified system
                            that transforms how modern hospitality enterprises
                            operate. As we continue to evolve and expand, LUCCCA
                            remains committed to innovation, sustainability, and
                            creating lasting value for our users and their
                            guests.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingSection>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Ecosystem Control Panel Modal */}
      {showAdminPanel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 50000 }}
        >
          <div className="bg-white dark:bg-slate-950 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-slate-800">
              <h2 className="text-2xl font-bold text-foreground">
                Ecosystem Control Panel
              </h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <EcosystemControlPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface SettingItemProps {
  label: string;
  description?: string;
  type: "toggle" | "slider" | "text";
  value: any;
  onChange: (value: any) => void;
}

function SettingItem({
  label,
  description,
  type,
  value,
  onChange,
}: SettingItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-colors last:border-transparent">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-white/60">{description}</p>
        )}
      </div>
      {type === "toggle" && (
        <button
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition-all",
            value ? "bg-cyan-300/90" : "bg-white/10",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform",
              value ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      )}
    </div>
  );
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
        {title}
      </h3>
      <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/5 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {children}
      </div>
    </div>
  );
}

// Profile Settings Component with proper persistence
function ProfileSettings() {
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem("user-display-name") || "Admin";
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("user-email") || "";
  });
  const [role, setRole] = useState<"Admin" | "Manager" | "Staff">(() => {
    return (localStorage.getItem("user-role") as "Admin" | "Manager" | "Staff") || "Admin";
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("user-display-name", displayName);
      localStorage.setItem("user-email", email);
      localStorage.setItem("user-role", role);
      
      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { displayName, email, role },
        }),
      );
      
      toast.success("Profile saved successfully");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Display Name
        </label>
        <Input
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="glass-input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Email
        </label>
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Role
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["Admin", "Manager", "Staff"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm border-2 transition-all",
                role === r
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border/30 hover:border-primary/50",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full glass-button bg-primary/20 hover:bg-primary/30 text-primary"
      >
        {isSaving ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
