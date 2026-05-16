import React, { useEffect, useState } from "react";
import {
  RotateCcw,
  Moon,
  Sun,
  Type,
  Palette,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import BackgroundUploadSection from "./BackgroundUploadSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyFontScale,
  applyHighContrast,
  applyTheme,
  AppearanceMode,
  BACKGROUND_NONE_SENTINEL,
  getDefaultPreferences,
  loadPreferences,
  savePreferences,
  syncBackgroundToBackend,
  ThemeName,
  ThemePreferences,
} from "@/lib/theme-manager";

type FontFamily = "inter" | "poppins" | "playfair" | "montserrat" | "lato";
type FontSize = "small" | "medium" | "large";

const FONT_FAMILIES: Array<{ id: FontFamily; label: string; preview: string }> =
  [
    { id: "inter", label: "Inter", preview: "Clean & Modern" },
    { id: "poppins", label: "Poppins", preview: "Rounded & Friendly" },
    { id: "playfair", label: "Playfair", preview: "Elegant & Classic" },
    { id: "montserrat", label: "Montserrat", preview: "Bold & Strong" },
    { id: "lato", label: "Lato", preview: "Warm & Readable" },
  ];

const FONT_SIZE_PRESETS: Array<{ id: FontSize; label: string; scale: number }> =
  [
    { id: "small", label: "Small", scale: 0.875 },
    { id: "medium", label: "Medium", scale: 1 },
    { id: "large", label: "Large", scale: 1.125 },
  ];

const THEME_LIST: Array<{
  id: ThemeName;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "echo",
    label: "LUCCCA Signature",
    description: "Cyan vibes - LUCCCA's distinctive look",
    icon: "L",
  },
  {
    id: "midnight",
    label: "Midnight Luxe",
    description: "Navy & gold - investor-ready elegance",
    icon: "M",
  },
  {
    id: "obsidian",
    label: "Obsidian Pro",
    description: "Deep dark with violet accents",
    icon: "O",
  },
  {
    id: "emerald",
    label: "Emerald Executive",
    description: "Luxury green for hospitality brands",
    icon: "E",
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    description: "Sophisticated pink-gold for upscale venues",
    icon: "R",
  },
  {
    id: "arctic",
    label: "Arctic Frost",
    description: "Cool ice-blue for modern fine dining",
    icon: "A",
  },
  {
    id: "corporate",
    label: "Corporate Professional",
    description: "Classic blue for business environments",
    icon: "C",
  },
  {
    id: "vibrant",
    label: "Vibrant Energy",
    description: "Bold colors with modern flair",
    icon: "V",
  },
  {
    id: "minimal",
    label: "Minimal Clean",
    description: "Simple grayscale for focused work",
    icon: "~",
  },
  {
    id: "warm",
    label: "Warm Hospitality",
    description: "Golden tones for hospitality industry",
    icon: "W",
  },
];

interface EnhancedAppearanceSettingsProps {
  onClose?: () => void;
}

function compressImageToWebP(file: File): Promise<string> {
  const MAX_INPUT_BYTES = 20 * 1024 * 1024;
  const MAX_OUTPUT_BYTES = 2.5 * 1024 * 1024;
  const MAX_IMAGE_DIMENSIONS = { width: 3840, height: 2160 };

  if (file.size > MAX_INPUT_BYTES) {
    return Promise.reject(
      new Error(
        `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use an image under 20MB.`,
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= 0 || height <= 0) {
        reject(new Error("Invalid image dimensions"));
        return;
      }

      if (
        width > MAX_IMAGE_DIMENSIONS.width ||
        height > MAX_IMAGE_DIMENSIONS.height
      ) {
        const ratio = Math.min(
          MAX_IMAGE_DIMENSIONS.width / width,
          MAX_IMAGE_DIMENSIONS.height / height,
        );
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const qualitySteps = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62];
      let best: string | null = null;

      for (const q of qualitySteps) {
        const candidate = canvas.toDataURL("image/webp", q);
        best = candidate;
        if (candidate.length <= MAX_OUTPUT_BYTES) {
          resolve(candidate);
          return;
        }
      }

      if (!best) {
        reject(new Error("Failed to encode image"));
        return;
      }

      const sizeMB = (best.length / 1024 / 1024).toFixed(1);
      reject(
        new Error(
          `Compressed image is still too large (${sizeMB}MB). Try a smaller image or crop it before uploading.`,
        ),
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function EnhancedAppearanceSettings({
  onClose,
}: EnhancedAppearanceSettingsProps) {
  const { setTheme } = useTheme();

  const [prefs, setPrefs] = useState<ThemePreferences>(loadPreferences());
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    (prefs.font as FontFamily) || "inter",
  );
  const [fontSize, setFontSize] = useState<FontSize>(() =>
    prefs.fontScale && prefs.fontScale < 0.9
      ? "small"
      : prefs.fontScale && prefs.fontScale > 1.05
        ? "large"
        : "medium",
  );
  const [fontScale, setFontScale] = useState(prefs.fontScale || 1.0);
  const [highContrast, setHighContrast] = useState(prefs.highContrast || false);
  const [showThemePreview, setShowThemePreview] = useState(false);

  const [lightBgPreview, setLightBgPreview] = useState<string | undefined>(
    prefs.backgroundImageLight &&
      prefs.backgroundImageLight !== BACKGROUND_NONE_SENTINEL
      ? prefs.backgroundImageLight
      : undefined,
  );
  const [darkBgPreview, setDarkBgPreview] = useState<string | undefined>(
    prefs.backgroundImageDark &&
      prefs.backgroundImageDark !== BACKGROUND_NONE_SENTINEL
      ? prefs.backgroundImageDark
      : undefined,
  );
  const [lightOpacity, setLightOpacity] = useState(
    prefs.backgroundOpacityLight || 0,
  );
  const [darkOpacity, setDarkOpacity] = useState(
    prefs.backgroundOpacityDark || 0,
  );
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);

  useEffect(() => {
    applyTheme(prefs);
  }, []);

  const updatePrefs = (updates: Partial<ThemePreferences>) => {
    setPrefs((prev) => {
      const next: ThemePreferences = { ...prev, ...updates };
      applyTheme(next);
      savePreferences(next);
      return next;
    });
  };

  useEffect(() => {
    if (fontScale < 0.9) setFontSize("small");
    else if (fontScale > 1.05) setFontSize("large");
    else setFontSize("medium");
  }, [fontScale]);

  const handleFontFamilySelect = (family: FontFamily) => {
    setFontFamily(family);
    import("@/lib/theme-manager").then(({ importFontLinks }) => {
      importFontLinks([family]);
      updatePrefs({ font: family });
      toast.success(`Font changed to ${FONT_FAMILIES.find((f) => f.id === family)?.label}`);
    });
  };

  const handleFontSizePreset = (preset: FontSize) => {
    const scaleMap: Record<FontSize, number> = {
      small: 0.875,
      medium: 1.0,
      large: 1.125,
    };
    const scale = scaleMap[preset];
    setFontSize(preset);
    handleFontScaleChange(scale);
  };

  const handleThemeSelect = (themeName: ThemeName) => {
    updatePrefs({ theme: themeName });
    toast.success(`Theme changed to ${themeName}`);
  };

  const handleModeSelect = (mode: AppearanceMode) => {
    updatePrefs({ appearance: mode });
    setTheme(mode);
  };

  const handleFontScaleChange = (scale: number) => {
    const validScale = Math.max(0.8, Math.min(1.5, scale));
    setFontScale(validScale);
    applyFontScale(validScale);
    updatePrefs({ fontScale: validScale });

    window.dispatchEvent(
      new CustomEvent("appearance-font-scale-changed", {
        detail: { fontScale: validScale },
      }),
    );
  };

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    applyHighContrast(enabled);
    updatePrefs({ highContrast: enabled });

    window.dispatchEvent(
      new CustomEvent("appearance-high-contrast-changed", {
        detail: { highContrast: enabled },
      }),
    );

    toast.success(enabled ? "High Contrast enabled" : "High Contrast disabled");
  };

  const handleBackgroundUpload = async (file: File, mode: "light" | "dark") => {
    let toastId: string | number | undefined;

    try {
      toastId = toast.loading(
        `Compressing ${mode === "light" ? "light" : "dark"} background image...`,
      );

      if (mode === "light") setUploadingLight(true);
      else setUploadingDark(true);

      const base64 = await compressImageToWebP(file);

      if (mode === "light") setLightBgPreview(base64);
      else setDarkBgPreview(base64);

      setPrefs((prev) => {
        const next: ThemePreferences =
          mode === "light"
            ? {
                ...prev,
                backgroundImageLight: base64,
                backgroundOpacityLight: lightOpacity,
              }
            : {
                ...prev,
                backgroundImageDark: base64,
                backgroundOpacityDark: darkOpacity,
              };

        applyTheme(next);
        savePreferences(next);
        syncBackgroundToBackend(
          next.backgroundImageLight ?? null,
          next.backgroundImageDark ?? null,
          next.backgroundOpacityLight || 0,
          next.backgroundOpacityDark || 0,
        );

        return next;
      });

      if (toastId) toast.dismiss(toastId);
      toast.success(
        mode === "light"
          ? "Light mode background updated"
          : "Dark mode background updated",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process image";
      if (toastId) toast.dismiss(toastId);
      toast.error(message);
    } finally {
      if (mode === "light") setUploadingLight(false);
      else setUploadingDark(false);
    }
  };

  const handleOpacityChange = (opacity: number, mode: "light" | "dark") => {
    const validOpacity = Math.max(0, Math.min(1, opacity));

    if (mode === "light") setLightOpacity(validOpacity);
    else setDarkOpacity(validOpacity);

    setPrefs((prev) => {
      const next: ThemePreferences =
        mode === "light"
          ? { ...prev, backgroundOpacityLight: validOpacity }
          : { ...prev, backgroundOpacityDark: validOpacity };

      applyTheme(next);
      savePreferences(next);
      syncBackgroundToBackend(
        next.backgroundImageLight ?? null,
        next.backgroundImageDark ?? null,
        next.backgroundOpacityLight || 0,
        next.backgroundOpacityDark || 0,
      );

      return next;
    });
  };

  const handleRemoveBackground = (mode: "light" | "dark") => {
    if (mode === "light") {
      setLightBgPreview(undefined);
      setLightOpacity(0);
    } else {
      setDarkBgPreview(undefined);
      setDarkOpacity(0);
    }

    setPrefs((prev) => {
      const next: ThemePreferences =
        mode === "light"
          ? {
              ...prev,
              backgroundImageLight: BACKGROUND_NONE_SENTINEL,
              backgroundOpacityLight: 0,
            }
          : {
              ...prev,
              backgroundImageDark: BACKGROUND_NONE_SENTINEL,
              backgroundOpacityDark: 0,
            };

      applyTheme(next);
      savePreferences(next);
      syncBackgroundToBackend(
        next.backgroundImageLight,
        next.backgroundImageDark,
        next.backgroundOpacityLight || 0,
        next.backgroundOpacityDark || 0,
      );

      return next;
    });

    toast.success(
      mode === "light"
        ? "Light mode background removed"
        : "Dark mode background removed",
    );
  };

  const handleReset = () => {
    const defaultPrefs = getDefaultPreferences();

    setPrefs(defaultPrefs);
    setFontFamily("inter");
    setFontSize("medium");
    setFontScale(defaultPrefs.fontScale || 1.0);
    setHighContrast(Boolean(defaultPrefs.highContrast));

    setLightBgPreview(
      defaultPrefs.backgroundImageLight &&
        defaultPrefs.backgroundImageLight !== BACKGROUND_NONE_SENTINEL
        ? defaultPrefs.backgroundImageLight
        : undefined,
    );
    setDarkBgPreview(
      defaultPrefs.backgroundImageDark &&
        defaultPrefs.backgroundImageDark !== BACKGROUND_NONE_SENTINEL
        ? defaultPrefs.backgroundImageDark
        : undefined,
    );
    setLightOpacity(defaultPrefs.backgroundOpacityLight || 0);
    setDarkOpacity(defaultPrefs.backgroundOpacityDark || 0);

    applyTheme(defaultPrefs);
    savePreferences(defaultPrefs);
    setTheme(defaultPrefs.appearance);

    syncBackgroundToBackend(
      defaultPrefs.backgroundImageLight,
      defaultPrefs.backgroundImageDark,
      defaultPrefs.backgroundOpacityLight || 0,
      defaultPrefs.backgroundOpacityDark || 0,
    );

    toast.success("Appearance settings reset to defaults");
  };

  return (
    <div className="space-y-8">
      <div className="border border-border bg-card text-foreground rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5" />
          <h3 className="text-lg font-semibold text-foreground">
            Font Settings
          </h3>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Typography
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Font family</div>
              <Select value={fontFamily} onValueChange={handleFontFamilySelect}>
                <SelectTrigger className="w-full glass-input" data-testid="appearance-font-family">
                  <SelectValue placeholder="Select font family" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((family) => {
                    const fontFamilyStyle = {
                      fontFamily:
                        family.id === "inter"
                          ? 'ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif'
                          : family.id === "poppins"
                          ? '"Poppins", sans-serif'
                          : family.id === "playfair"
                          ? '"Playfair Display", serif'
                          : family.id === "montserrat"
                          ? '"Montserrat", sans-serif'
                          : '"Lato", sans-serif',
                    };
                    return (
                      <SelectItem key={family.id} value={family.id}>
                        <span className="font-semibold" style={fontFamilyStyle}>{family.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Font size</div>
              <Select value={fontSize} onValueChange={(value) => handleFontSizePreset(value as FontSize)}>
                <SelectTrigger className="w-full glass-input" data-testid="appearance-font-size">
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold">{preset.label}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(preset.scale * 100)}%</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Live Preview */}
          <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Preview</p>
            <div
              className="text-foreground"
              style={{
                fontFamily:
                  fontFamily === "inter"
                    ? 'ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif'
                    : fontFamily === "poppins"
                    ? '"Poppins", sans-serif'
                    : fontFamily === "playfair"
                    ? '"Playfair Display", serif'
                    : fontFamily === "montserrat"
                    ? '"Montserrat", sans-serif'
                    : '"Lato", sans-serif',
                fontSize: `${fontScale}rem`,
              }}
            >
              <p className="font-semibold mb-1">The quick brown fox jumps over the lazy dog</p>
              <p className="text-sm opacity-80">1234567890</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border bg-card text-foreground rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-foreground">Theme</h3>
          </div>
          <button
            onClick={() => setShowThemePreview(!showThemePreview)}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
          >
            {showThemePreview ? "Hide" : "Show"} Preview
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {THEME_LIST.map((theme) => {
            const themeConfig = {
              echo: { primary: "#06b6d4", bg: "from-cyan-500/10 to-cyan-600/5" },
              corporate: { primary: "#3b82f6", bg: "from-blue-500/10 to-blue-600/5" },
              vibrant: { primary: "#ef4444", bg: "from-red-500/10 to-orange-500/5" },
              minimal: { primary: "#6b7280", bg: "from-gray-500/10 to-gray-600/5" },
              warm: { primary: "#f59e0b", bg: "from-amber-500/10 to-yellow-500/5" },
              obsidian: { primary: "#8b5cf6", bg: "from-violet-500/10 to-violet-600/5" },
              emerald: { primary: "#059669", bg: "from-emerald-500/10 to-emerald-600/5" },
              midnight: { primary: "#1e3a5f", bg: "from-slate-500/10 to-amber-500/5" },
              "rose-gold": { primary: "#e11d48", bg: "from-rose-500/10 to-rose-600/5" },
              arctic: { primary: "#0284c7", bg: "from-sky-500/10 to-sky-600/5" },
            }[theme.id] || { primary: "#6b7280", bg: "from-gray-500/10 to-gray-600/5" };
            
            return (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all group",
                  "hover:shadow-lg hover:scale-[1.01]",
                  prefs.theme === theme.id
                    ? "border-primary bg-gradient-to-br shadow-md"
                    : "border-border hover:border-primary/50",
                )}
                style={
                  prefs.theme === theme.id
                    ? {
                        borderColor: themeConfig.primary,
                        background: `linear-gradient(135deg, ${themeConfig.primary}15, ${themeConfig.primary}08)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{theme.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{theme.label}</p>
                        {prefs.theme === theme.id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>
                  </div>
                  {prefs.theme === theme.id && (
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {showThemePreview && (
          <div className="mt-6 space-y-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Preview - Light & Dark Variants
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-center text-foreground">
                  Light Mode
                </p>
                {THEME_LIST.map((theme) => (
                  <div
                    key={`${theme.id}-light`}
                    className={cn(
                      "p-3 rounded border-2 border-border text-center text-sm font-semibold transition-all cursor-pointer",
                      prefs.theme === theme.id && prefs.appearance === "light"
                        ? "ring-2 ring-primary"
                        : "",
                    )}
                    onClick={() => {
                      handleThemeSelect(theme.id);
                      handleModeSelect("light");
                    }}
                  >
                    <div className="text-lg mb-1">{theme.icon}</div>
                    {theme.label}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-center text-foreground">
                  Dark Mode
                </p>
                {THEME_LIST.map((theme) => (
                  <div
                    key={`${theme.id}-dark`}
                    className={cn(
                      "p-3 rounded border-2 border-border text-center text-sm font-semibold transition-all cursor-pointer bg-slate-800 text-slate-100",
                      prefs.theme === theme.id && prefs.appearance === "dark"
                        ? "ring-2 ring-primary"
                        : "",
                    )}
                    onClick={() => {
                      handleThemeSelect(theme.id);
                      handleModeSelect("dark");
                    }}
                  >
                    <div className="text-lg mb-1">{theme.icon}</div>
                    {theme.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-border bg-card text-foreground rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Appearance Mode
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleModeSelect("light")}
            className={cn(
              "p-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all",
              prefs.appearance === "light"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50",
            )}
          >
            <Sun className="w-5 h-5" />
            <span className="font-semibold">Light</span>
          </button>
          <button
            onClick={() => handleModeSelect("dark")}
            className={cn(
              "p-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all",
              prefs.appearance === "dark"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50",
            )}
          >
            <Moon className="w-5 h-5" />
            <span className="font-semibold">Dark</span>
          </button>
        </div>
      </div>

      <div className="border border-border bg-card text-foreground rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold text-foreground">
            Background Images
          </h3>
        </div>

        <div className="grid gap-8">
          <BackgroundUploadSection
            mode="light"
            backgroundPreview={lightBgPreview}
            opacity={lightOpacity}
            onBackgroundUpload={(file) => handleBackgroundUpload(file, "light")}
            onRemoveBackground={() => handleRemoveBackground("light")}
            onOpacityChange={(opacity) => handleOpacityChange(opacity, "light")}
            isUploading={uploadingLight}
            icon={<Sun className="w-4 h-4" />}
            title="Light Mode Background"
          />

          <BackgroundUploadSection
            mode="dark"
            backgroundPreview={darkBgPreview}
            opacity={darkOpacity}
            onBackgroundUpload={(file) => handleBackgroundUpload(file, "dark")}
            onRemoveBackground={() => handleRemoveBackground("dark")}
            onOpacityChange={(opacity) => handleOpacityChange(opacity, "dark")}
            isUploading={uploadingDark}
            icon={<Moon className="w-4 h-4" />}
            title="Dark Mode Background"
          />
        </div>
      </div>

      <div className="border border-border bg-card text-foreground rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Accessibility</h3>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-foreground">High Contrast</span>
            <span className="text-xs text-muted-foreground">
              Increases color contrast for better readability
            </span>
          </label>
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => handleHighContrastChange(e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
      </div>

      <div className="border border-border bg-card text-foreground rounded-lg p-6">
        <button
          onClick={handleReset}
          className={cn(
            "w-full py-2 px-4 rounded-lg border-2 font-semibold transition-all flex items-center justify-center gap-2",
            "border-destructive text-destructive hover:bg-destructive/10",
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
