import React, { useState, useEffect } from "react";
import { RotateCcw, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { toast } from "sonner";
import BackgroundUploadSection from "./BackgroundUploadSection";
import {
  applyTheme,
  applyFontScale,
  applyBackgroundImages,
  applyHighContrast,
  savePreferences,
  loadPreferences,
  fetchPreferencesFromBackend,
  syncBackgroundToBackend,
  THEMES,
  ThemeName,
  AppearanceMode,
  ThemePreferences,
} from "@/lib/theme-manager";
import { useTheme } from "next-themes";

interface Theme {
  id: ThemeName;
  label: string;
  description: string;
  icon: string;
}

const THEME_LIST: Theme[] = [
  {
    id: "echo",
    label: "LUCCCA",
    description: "Cyan vibes - LUCCCA's distinctive look",
    icon: "✨",
  },
  {
    id: "corporate",
    label: "Corporate Professional",
    description: "Classic blue for business environments",
    icon: "💼",
  },
  {
    id: "vibrant",
    label: "Vibrant Energy",
    description: "Bold colors with modern flair",
    icon: "⚡",
  },
  {
    id: "minimal",
    label: "Minimal Clean",
    description: "Simple grayscale for focused work",
    icon: "◇",
  },
  {
    id: "warm",
    label: "Warm Hospitality",
    description: "Golden tones for hospitality industry",
    icon: "☀️",
  },
];

interface AppearanceSettingsProps {
  onClose?: () => void;
}

export default function AppearanceSettings({
  onClose,
}: AppearanceSettingsProps) {
  const { theme: nextTheme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<ThemePreferences>(loadPreferences());
  const [fontScale, setFontScale] = useState(prefs.fontScale || 1.0);
  const [highContrast, setHighContrast] = useState(prefs.highContrast || false);
  const [lightBgPreview, setLightBgPreview] = useState(
    prefs.backgroundImageLight,
  );
  const [darkBgPreview, setDarkBgPreview] = useState(prefs.backgroundImageDark);
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

  // Handle theme selection
  const handleThemeSelect = (themeName: ThemeName) => {
    const newPrefs: ThemePreferences = {
      ...prefs,
      theme: themeName,
    };
    setPrefs(newPrefs);
    applyTheme(newPrefs);
    savePreferences(newPrefs);
  };

  // Handle mode selection (light/dark)
  const handleModeSelect = (mode: AppearanceMode) => {
    const newPrefs: ThemePreferences = {
      ...prefs,
      appearance: mode,
    };
    setPrefs(newPrefs);
    applyTheme(newPrefs);
    savePreferences(newPrefs);
    setTheme(mode);
  };

  // Handle font scale change
  const handleFontScaleChange = (scale: number) => {
    const validScale = Math.max(0.8, Math.min(1.5, scale));
    setFontScale(validScale);
    applyFontScale(validScale);

    const newPrefs: ThemePreferences = {
      ...prefs,
      fontScale: validScale,
    };
    setPrefs(newPrefs);
    savePreferences(newPrefs);

    // Dispatch event for accessibility settings to mirror
    window.dispatchEvent(
      new CustomEvent("appearance-font-scale-changed", {
        detail: { fontScale: validScale },
      }),
    );
  };

  // Handle high contrast toggle
  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    applyHighContrast(enabled);

    const newPrefs: ThemePreferences = {
      ...prefs,
      highContrast: enabled,
    };
    setPrefs(newPrefs);
    savePreferences(newPrefs);

    // Dispatch event for accessibility settings to mirror
    window.dispatchEvent(
      new CustomEvent("appearance-high-contrast-changed", {
        detail: { highContrast: enabled },
      }),
    );

    toast.success(enabled ? "High Contrast enabled" : "High Contrast disabled");
  };

  // Compress image to WebP format for better storage efficiency
  const compressImageToWebP = async (file: File): Promise<string> => {
    const MAX_IMAGE_SIZE = 500 * 1024; // 500KB
    const MAX_IMAGE_DIMENSIONS = { width: 2560, height: 1440 };

    // Check file size before compression
    if (file.size > MAX_IMAGE_SIZE * 2) {
      throw new Error(
        `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use an image under 1MB.`
      );
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");

      img.onload = () => {
        // Calculate scaled dimensions
        let width = img.width;
        let height = img.height;

        if (
          width > MAX_IMAGE_DIMENSIONS.width ||
          height > MAX_IMAGE_DIMENSIONS.height
        ) {
          const ratio = Math.min(
            MAX_IMAGE_DIMENSIONS.width / width,
            MAX_IMAGE_DIMENSIONS.height / height
          );
          width *= ratio;
          height *= ratio;
        }

        // Draw to canvas and convert to WebP
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP with 85% quality
        const base64 = canvas.toDataURL("image/webp", 0.85);

        const originalSizeKB = (file.size / 1024).toFixed(1);
        const compressedSizeKB = (base64.length / 1024).toFixed(1);
        console.log(
          `[BACKGROUND-IMAGE] Compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB`
        );

        // Verify compressed size is acceptable
        if (base64.length > MAX_IMAGE_SIZE) {
          reject(
            new Error(
              `Compressed image too large (${compressedSizeKB}KB). Try a smaller source image.`
            )
          );
          return;
        }

        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
  };

  // Handle background image upload
  const handleBackgroundUpload = async (
    file: File,
    mode: "light" | "dark"
  ) => {
    let toastId: string | number | undefined;
    try {
      // Capture the toast ID so we can dismiss it later
      toastId = toast.loading(`Compressing ${mode} background image...`);
      const base64 = await compressImageToWebP(file);

      if (mode === "light") {
        setLightBgPreview(base64);
        const newPrefs: ThemePreferences = {
          ...prefs,
          backgroundImageLight: base64,
          backgroundOpacityLight: lightOpacity,
        };
        setPrefs(newPrefs);
        applyBackgroundImages({
          light: base64,
          opacityLight: lightOpacity,
        });
        savePreferences(newPrefs);
        // Sync background to backend (persists across devices/logins)
        syncBackgroundToBackend(
          base64,
          prefs.backgroundImageDark,
          lightOpacity,
          prefs.backgroundOpacityDark,
        );
        // Dismiss loading toast and show success
        if (toastId) toast.dismiss(toastId);
        toast.success("Light mode background updated and saved to LUCCCA");
      } else {
        setDarkBgPreview(base64);
        const newPrefs: ThemePreferences = {
          ...prefs,
          backgroundImageDark: base64,
          backgroundOpacityDark: darkOpacity,
        };
        setPrefs(newPrefs);
        applyBackgroundImages({
          dark: base64,
          opacityDark: darkOpacity,
        });
        savePreferences(newPrefs);
        // Sync background to backend (persists across devices/logins)
        syncBackgroundToBackend(
          prefs.backgroundImageLight,
          base64,
          prefs.backgroundOpacityLight,
          darkOpacity,
        );
        // Dismiss loading toast and show success
        if (toastId) toast.dismiss(toastId);
        toast.success("Dark mode background updated and saved to LUCCCA");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process image";
      console.error(`[BACKGROUND-IMAGE] Error: ${message}`);
      // Dismiss loading toast before showing error
      if (toastId) toast.dismiss(toastId);
      toast.error(message);
    }
  };

  // Handle opacity change
  const handleOpacityChange = (opacity: number, mode: "light" | "dark") => {
    const validOpacity = Math.max(0, Math.min(1, opacity));

    if (mode === "light") {
      setLightOpacity(validOpacity);
      const newPrefs: ThemePreferences = {
        ...prefs,
        backgroundOpacityLight: validOpacity,
      };
      setPrefs(newPrefs);
      applyBackgroundImages({
        light: prefs.backgroundImageLight,
        opacityLight: validOpacity,
      });
      savePreferences(newPrefs);
      // Sync to backend
      syncBackgroundToBackend(
        prefs.backgroundImageLight,
        prefs.backgroundImageDark,
        validOpacity,
        prefs.backgroundOpacityDark,
      );
    } else {
      setDarkOpacity(validOpacity);
      const newPrefs: ThemePreferences = {
        ...prefs,
        backgroundOpacityDark: validOpacity,
      };
      setPrefs(newPrefs);
      applyBackgroundImages({
        dark: prefs.backgroundImageDark,
        opacityDark: validOpacity,
      });
      savePreferences(newPrefs);
      // Sync to backend
      syncBackgroundToBackend(
        prefs.backgroundImageLight,
        prefs.backgroundImageDark,
        prefs.backgroundOpacityLight,
        validOpacity,
      );
    }
  };

  // Remove background image
  const handleRemoveBackground = (mode: "light" | "dark") => {
    if (mode === "light") {
      setLightBgPreview(undefined);
      const newPrefs: ThemePreferences = {
        ...prefs,
        backgroundImageLight: undefined,
        backgroundOpacityLight: 0,
      };
      setPrefs(newPrefs);
      applyBackgroundImages({ light: null });
      savePreferences(newPrefs);
      // Remove from backend
      syncBackgroundToBackend(
        null,
        prefs.backgroundImageDark,
        0,
        prefs.backgroundOpacityDark,
      );
      toast.success("Light mode background removed from LUCCCA");
    } else {
      setDarkBgPreview(undefined);
      const newPrefs: ThemePreferences = {
        ...prefs,
        backgroundImageDark: undefined,
        backgroundOpacityDark: 0,
      };
      setPrefs(newPrefs);
      applyBackgroundImages({ dark: null });
      savePreferences(newPrefs);
      // Remove from backend
      syncBackgroundToBackend(
        prefs.backgroundImageLight,
        null,
        prefs.backgroundOpacityLight,
        0,
      );
      toast.success("Dark mode background removed from LUCCCA");
    }
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultPrefs: ThemePreferences = {
      theme: "echo",
      font: "inter",
      appearance: "dark",
      fontScale: 1.0,
      backgroundImageLight: undefined,
      backgroundImageDark: undefined,
      backgroundOpacityLight: 0,
      backgroundOpacityDark: 0,
    };

    setPrefs(defaultPrefs);
    setFontScale(1.0);
    setLightBgPreview(undefined);
    setDarkBgPreview(undefined);
    setLightOpacity(0);
    setDarkOpacity(0);

    applyTheme(defaultPrefs);
    savePreferences(defaultPrefs);
    setTheme("dark");
  };

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Theme</h3>
        <div className="grid grid-cols-1 gap-3">
          {THEME_LIST.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={cn(
                "pt-4 pr-4 pb-0 pl-4 rounded-lg border-2 text-left transition-all",
                prefs.theme === theme.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{theme.icon}</span>
                <div>
                  <p className="font-semibold">{theme.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {theme.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size Scaling */}
      <div className="mt-5">
        <h3 className="text-lg font-semibold mb-4">Font Size</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              80%
            </span>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={fontScale}
              onChange={(e) =>
                handleFontScaleChange(parseFloat(e.target.value))
              }
              className="flex-1 mx-4"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              150%
            </span>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {Math.round(fontScale * 100)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current scale: {fontScale.toFixed(1)}x
            </p>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-base">Sample text at current scale</p>
            <p style={{ fontSize: `${fontScale}rem` }} className="mt-2">
              Appearance Preview
            </p>
          </div>
        </div>
      </div>

      {/* High Contrast Toggle */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Accessibility</h3>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => handleHighContrastChange(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <div>
            <p className="font-medium text-foreground">High Contrast Mode</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maximize brightness difference for improved readability
            </p>
          </div>
        </label>
      </div>

      {/* Light Mode Background */}
      <BackgroundUploadSection
        mode="light"
        backgroundPreview={lightBgPreview}
        opacity={lightOpacity}
        onBackgroundUpload={(file) => handleBackgroundUpload(file, "light")}
        onRemoveBackground={() => handleRemoveBackground("light")}
        onOpacityChange={(opacity) => handleOpacityChange(opacity, "light")}
        isUploading={uploadingLight}
        icon={<Sun size={20} />}
        title="Light Mode Background"
      />

      {/* Dark Mode Background */}
      <BackgroundUploadSection
        mode="dark"
        backgroundPreview={darkBgPreview}
        opacity={darkOpacity}
        onBackgroundUpload={(file) => handleBackgroundUpload(file, "dark")}
        onRemoveBackground={() => handleRemoveBackground("dark")}
        onOpacityChange={(opacity) => handleOpacityChange(opacity, "dark")}
        isUploading={uploadingDark}
        icon={<Moon size={20} />}
        title="Dark Mode Background"
      />

      {/* Reset Button */}
      <div>
        <Button
          onClick={handleReset}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
