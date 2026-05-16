/**
 * Theme Manager
 * Manages 5 professional themes with light/dark variants and font selection
 */

export type ThemeName = "corporate" | "vibrant" | "minimal" | "warm" | "echo" | "obsidian" | "emerald" | "midnight" | "rose-gold" | "arctic";
export type FontName = "inter" | "poppins" | "playfair" | "montserrat" | "lato";
export type AppearanceMode = "light" | "dark";

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  description: string;
  icon: string;
  colorsPrimary: {
    light: string;
    dark: string;
  };
  colorsSecondary: {
    light: string;
    dark: string;
  };
  colorsAccent: {
    light: string;
    dark: string;
  };
  colorsBackground: {
    light: string;
    dark: string;
  };
  colorsText: {
    light: string;
    dark: string;
  };
  colorsBorder: {
    light: string;
    dark: string;
  };
  colorsSurface: {
    light: string;
    dark: string;
  };
}

export interface FontConfig {
  name: FontName;
  label: string;
  description: string;
  fontFamily: string;
  googleFonts?: string; // URL for Google Fonts import
  weights: number[];
}

// 5 Professional Themes
export const THEMES: Record<ThemeName, ThemeConfig> = {
  corporate: {
    name: "corporate",
    label: "Corporate Professional",
    description: "Classic blue & gray for business environments",
    icon: "💼",
    colorsPrimary: {
      light: "#003d7a",
      dark: "#60a5fa",
    },
    colorsSecondary: {
      light: "#4b5563",
      dark: "#cbd5e1",
    },
    colorsAccent: {
      light: "#0052a3",
      dark: "#93c5fd",
    },
    colorsBackground: {
      light: "#f8fafc",
      dark: "#0f172a",
    },
    colorsText: {
      light: "#1e293b",
      dark: "#f1f5f9",
    },
    colorsBorder: {
      light: "#cbd5e1",
      dark: "#334155",
    },
    colorsSurface: {
      light: "#e2e8f0",
      dark: "#1e293b",
    },
  },
  vibrant: {
    name: "vibrant",
    label: "Vibrant Energy",
    description: "Bold colors with modern flair",
    icon: "⚡",
    colorsPrimary: {
      light: "#dc2626",
      dark: "#fca5a5",
    },
    colorsSecondary: {
      light: "#ea580c",
      dark: "#fdba74",
    },
    colorsAccent: {
      light: "#c2410c",
      dark: "#fed7aa",
    },
    colorsBackground: {
      light: "#fffbf0",
      dark: "#1f1410",
    },
    colorsText: {
      light: "#3f1f1f",
      dark: "#fef3c7",
    },
    colorsBorder: {
      light: "#fecaca",
      dark: "#7c2d12",
    },
    colorsSurface: {
      light: "#fee2e2",
      dark: "#431407",
    },
  },
  minimal: {
    name: "minimal",
    label: "Minimal Clean",
    description: "Simple grayscale for focused work",
    icon: "◇",
    colorsPrimary: {
      light: "#1f2937",
      dark: "#e5e7eb",
    },
    colorsSecondary: {
      light: "#4b5563",
      dark: "#9ca3af",
    },
    colorsAccent: {
      light: "#111827",
      dark: "#f3f4f6",
    },
    colorsBackground: {
      light: "#fafafa",
      dark: "#09090b",
    },
    colorsText: {
      light: "#1a1a1a",
      dark: "#f5f5f5",
    },
    colorsBorder: {
      light: "#e5e5e5",
      dark: "#27272a",
    },
    colorsSurface: {
      light: "#f0f0f0",
      dark: "#18181b",
    },
  },
  warm: {
    name: "warm",
    label: "Warm Hospitality",
    description: "Golden tones for hospitality industry",
    icon: "☀️",
    colorsPrimary: {
      light: "#92400e",
      dark: "#fcd34d",
    },
    colorsSecondary: {
      light: "#b45309",
      dark: "#fbbf24",
    },
    colorsAccent: {
      light: "#d97706",
      dark: "#fde047",
    },
    colorsBackground: {
      light: "#fefce8",
      dark: "#1a1410",
    },
    colorsText: {
      light: "#3f2f1f",
      dark: "#fef3c7",
    },
    colorsBorder: {
      light: "#fed7aa",
      dark: "#78350f",
    },
    colorsSurface: {
      light: "#fef08a",
      dark: "#451a03",
    },
  },
  echo: {
    name: "echo",
    label: "Echo Signature",
    description: "Cyan vibes - LUCCCA's distinctive look",
    icon: "✨",
    colorsPrimary: {
      light: "#0369a1",
      dark: "#06b6d4",
    },
    colorsSecondary: {
      light: "#0c4a6e",
      dark: "#67e8f9",
    },
    colorsAccent: {
      light: "#0284c7",
      dark: "#22d3ee",
    },
    colorsBackground: {
      light: "#ecf0f1",
      dark: "#0c1117",
    },
    colorsText: {
      light: "#0f172a",
      dark: "#e0f2fe",
    },
    colorsBorder: {
      light: "#7dd3fc",
      dark: "#164e63",
    },
    colorsSurface: {
      light: "#cffafe",
      dark: "#082f49",
    },
  },
  obsidian: {
    name: "obsidian",
    label: "Obsidian Pro",
    description: "Deep dark with violet accents - developer favorite",
    icon: "O",
    colorsPrimary: { light: "#6d28d9", dark: "#a78bfa" },
    colorsSecondary: { light: "#7c3aed", dark: "#c4b5fd" },
    colorsAccent: { light: "#8b5cf6", dark: "#ddd6fe" },
    colorsBackground: { light: "#faf5ff", dark: "#0a0a0f" },
    colorsText: { light: "#1e1b4b", dark: "#ede9fe" },
    colorsBorder: { light: "#c4b5fd", dark: "#1e1b4b" },
    colorsSurface: { light: "#ede9fe", dark: "#13111f" },
  },
  emerald: {
    name: "emerald",
    label: "Emerald Executive",
    description: "Rich green for luxury hospitality brands",
    icon: "E",
    colorsPrimary: { light: "#065f46", dark: "#34d399" },
    colorsSecondary: { light: "#047857", dark: "#6ee7b7" },
    colorsAccent: { light: "#059669", dark: "#a7f3d0" },
    colorsBackground: { light: "#f0fdf4", dark: "#022c22" },
    colorsText: { light: "#052e16", dark: "#ecfdf5" },
    colorsBorder: { light: "#86efac", dark: "#064e3b" },
    colorsSurface: { light: "#d1fae5", dark: "#052e16" },
  },
  midnight: {
    name: "midnight",
    label: "Midnight Luxe",
    description: "Deep navy with gold accents - investor-ready",
    icon: "M",
    colorsPrimary: { light: "#1e3a5f", dark: "#f59e0b" },
    colorsSecondary: { light: "#1e40af", dark: "#fbbf24" },
    colorsAccent: { light: "#b45309", dark: "#fcd34d" },
    colorsBackground: { light: "#f8fafc", dark: "#020617" },
    colorsText: { light: "#0f172a", dark: "#f8fafc" },
    colorsBorder: { light: "#cbd5e1", dark: "#1e293b" },
    colorsSurface: { light: "#e2e8f0", dark: "#0f172a" },
  },
  "rose-gold": {
    name: "rose-gold",
    label: "Rose Gold",
    description: "Sophisticated pink-gold for upscale venues",
    icon: "R",
    colorsPrimary: { light: "#9f1239", dark: "#fb7185" },
    colorsSecondary: { light: "#be123c", dark: "#fda4af" },
    colorsAccent: { light: "#e11d48", dark: "#fecdd3" },
    colorsBackground: { light: "#fff1f2", dark: "#1a0a0e" },
    colorsText: { light: "#4c0519", dark: "#ffe4e6" },
    colorsBorder: { light: "#fecdd3", dark: "#4c0519" },
    colorsSurface: { light: "#ffe4e6", dark: "#2a0a12" },
  },
  arctic: {
    name: "arctic",
    label: "Arctic Frost",
    description: "Cool ice-blue for modern fine dining",
    icon: "A",
    colorsPrimary: { light: "#0c4a6e", dark: "#7dd3fc" },
    colorsSecondary: { light: "#075985", dark: "#bae6fd" },
    colorsAccent: { light: "#0284c7", dark: "#e0f2fe" },
    colorsBackground: { light: "#f0f9ff", dark: "#020d1a" },
    colorsText: { light: "#082f49", dark: "#e0f2fe" },
    colorsBorder: { light: "#bae6fd", dark: "#0c4a6e" },
    colorsSurface: { light: "#e0f2fe", dark: "#0a1929" },
  },
};

// 5 Professional Fonts
export const FONTS: Record<FontName, FontConfig> = {
  inter: {
    name: "inter",
    label: "Inter",
    description: "Modern sans-serif (EchoRecipePro style)",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Inter", "SF Pro", Roboto, "Segoe UI", Arial, "Noto Sans"',
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
    weights: [400, 500, 600, 700, 800],
  },
  poppins: {
    name: "poppins",
    label: "Poppins",
    description: "Geometric and friendly",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Poppins", "SF Pro", Roboto, "Segoe UI"',
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
    weights: [400, 500, 600, 700, 800],
  },
  playfair: {
    name: "playfair",
    label: "Playfair Display",
    description: "Elegant serif for headings",
    fontFamily:
      '"Playfair Display", ui-serif, system-ui, -apple-system, Georgia, "Times New Roman", serif',
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap",
    weights: [400, 500, 600, 700, 800],
  },
  montserrat: {
    name: "montserrat",
    label: "Montserrat",
    description: "Bold geometric sans-serif",
    fontFamily:
      '"Montserrat", ui-sans-serif, system-ui, -apple-system, "SF Pro", Roboto, "Segoe UI"',
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap",
    weights: [400, 500, 600, 700, 800],
  },
  lato: {
    name: "lato",
    label: "Lato",
    description: "Warm and stable",
    fontFamily:
      '"Lato", ui-sans-serif, system-ui, -apple-system, "SF Pro", Roboto, "Segoe UI"',
    googleFonts:
      "https://fonts.googleapis.com/css2?family=Lato:wght@400;500;600;700;800&display=swap",
    weights: [400, 500, 600, 700, 800],
  },
};

const THEME_CLASS_NAMES = Object.keys(THEMES).map((name) => `theme-${name}`);
const FONT_CLASS_NAMES: Record<FontName, string | null> = {
  inter: null,
  poppins: "font-family-poppins",
  playfair: "font-family-playfair",
  montserrat: "font-family-montserrat",
  lato: "font-family-lato",
};

function removeClasses(root: HTMLElement, classes: Array<string | null | undefined>) {
  classes.forEach((className) => {
    if (className) {
      root.classList.remove(className);
    }
  });
}

function setVariables(root: HTMLElement, variables: Record<string, string>) {
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export interface ThemePreferences {
  theme: ThemeName;
  font: FontName;
  appearance: AppearanceMode;
  fontScale?: number; // 0.8 to 1.5 (default 1.0)
  highContrast?: boolean; // Enable high contrast mode for accessibility (default false)
  backgroundImageLight?: string; // Base64 or URL for light mode
  backgroundImageDark?: string; // Base64 or URL for dark mode
  backgroundOpacityLight?: number; // 0 to 1 (default 0)
  backgroundOpacityDark?: number; // 0 to 1 (default 0)
}

export const BACKGROUND_NONE_SENTINEL = "__none__";

export const DEFAULT_BACKGROUND_IMAGE_LIGHT =
  "https://cdn.builder.io/api/v1/image/assets%2Fe33328d06dce4e279c4e2c119bb4b07c%2F381baef077c34520a54d42619fa6906e?format=webp&width=2400";
export const DEFAULT_BACKGROUND_IMAGE_DARK =
  "https://cdn.builder.io/api/v1/image/assets%2Fe33328d06dce4e279c4e2c119bb4b07c%2F51ac8ea41cbb4592882af4b41641ab8c?format=webp&width=2400";

const STORAGE_KEY = "luccca-theme-preferences";

export function getDefaultPreferences(): ThemePreferences {
  return {
    theme: "echo",
    font: "inter",
    appearance: "light",
    fontScale: 1.0,
    highContrast: false,
    backgroundImageLight: DEFAULT_BACKGROUND_IMAGE_LIGHT,
    backgroundImageDark: DEFAULT_BACKGROUND_IMAGE_DARK,
    backgroundOpacityLight: 0.18,
    backgroundOpacityDark: 0.18,
  };
}

export function loadPreferences(): ThemePreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const defaults = getDefaultPreferences();
      return {
        theme: (parsed.theme || defaults.theme) as ThemeName,
        font: (parsed.font || defaults.font) as FontName,
        appearance: (parsed.appearance ||
          defaults.appearance) as AppearanceMode,
        fontScale: Math.max(
          0.8,
          Math.min(1.5, parsed.fontScale || defaults.fontScale || 1.0),
        ),
        highContrast: parsed.highContrast ?? defaults.highContrast,
        backgroundImageLight:
          parsed.backgroundImageLight === BACKGROUND_NONE_SENTINEL
            ? BACKGROUND_NONE_SENTINEL
            : (parsed.backgroundImageLight ?? defaults.backgroundImageLight),
        backgroundImageDark:
          parsed.backgroundImageDark === BACKGROUND_NONE_SENTINEL
            ? BACKGROUND_NONE_SENTINEL
            : (parsed.backgroundImageDark ?? defaults.backgroundImageDark),
        backgroundOpacityLight: Math.max(
          0,
          Math.min(
            1,
            parsed.backgroundOpacityLight ??
              defaults.backgroundOpacityLight ??
              0,
          ),
        ),
        backgroundOpacityDark: Math.max(
          0,
          Math.min(
            1,
            parsed.backgroundOpacityDark ?? defaults.backgroundOpacityDark ?? 0,
          ),
        ),
      };
    }
  } catch (error) {
    console.error("Failed to load theme preferences:", error);
  }
  return getDefaultPreferences();
}

/**
 * Fetch preferences from backend (synced across devices)
 * Falls back to localStorage if not logged in
 * Guaranteed to never throw - always returns valid preferences
 */
export async function fetchPreferencesFromBackend(): Promise<ThemePreferences> {
  try {
    // Use Promise.race for timeout instead of AbortController to avoid uncaught errors
    const response = await Promise.race([
      fetch("/api/user-preferences", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }),
      new Promise<Response>((_, reject) => {
        setTimeout(
          () =>
            reject(new Error("Theme preference fetch timeout after 5 seconds")),
          5000,
        );
      }),
    ]);

    if (response.status === 401) {
      // Not authenticated - use local preferences
      return loadPreferences();
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const defaults = getDefaultPreferences();
    return {
      theme: (data.theme || defaults.theme) as ThemeName,
      font: (data.font || defaults.font) as FontName,
      appearance: (data.appearance || defaults.appearance) as AppearanceMode,
      fontScale: Math.max(
        0.8,
        Math.min(1.5, data.fontScale || defaults.fontScale || 1.0),
      ),
      highContrast: data.highContrast ?? defaults.highContrast,
      backgroundImageLight:
        data.backgroundImageLight === BACKGROUND_NONE_SENTINEL
          ? BACKGROUND_NONE_SENTINEL
          : (data.backgroundImageLight ?? defaults.backgroundImageLight),
      backgroundImageDark:
        data.backgroundImageDark === BACKGROUND_NONE_SENTINEL
          ? BACKGROUND_NONE_SENTINEL
          : (data.backgroundImageDark ?? defaults.backgroundImageDark),
      backgroundOpacityLight: Math.max(
        0,
        Math.min(
          1,
          data.backgroundOpacityLight ?? defaults.backgroundOpacityLight ?? 0,
        ),
      ),
      backgroundOpacityDark: Math.max(
        0,
        Math.min(
          1,
          data.backgroundOpacityDark ?? defaults.backgroundOpacityDark ?? 0,
        ),
      ),
    };
  } catch (error) {
    // Handle all errors silently - these are background operations
    // Network errors (TypeError "Failed to fetch") are expected in offline/backend-down scenarios
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || error.message?.includes("aborted"));
    const isTimeout =
      error instanceof Error && error.message?.includes("timeout");

    if (isAbort || isTimeout) {
      console.debug(
        `Theme preference fetch ${isTimeout ? "timed out" : "aborted"}, using local preferences`,
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Failed to fetch")) {
        console.debug(
          "Theme preference fetch failed (network error), using local preferences",
        );
      } else {
        console.debug(
          "Failed to fetch theme preferences from backend:",
          errorMessage,
        );
      }
    }

    // Fallback to local preferences on any error (timeout, network, 4xx, 5xx, etc.)
    try {
      return loadPreferences();
    } catch (fallbackError) {
      console.debug(
        "Error loading local preferences fallback:",
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError),
      );
      return getDefaultPreferences();
    }
  }
}

/**
 * Save preferences to backend and localStorage
 * Ensures persistence across devices and logins
 */
export function savePreferences(prefs: ThemePreferences): void {
  try {
    // Save to localStorage first (immediate availability)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    // Sync to backend (asynchronously) - non-critical, silent fallback
    syncPreferencesToBackend(prefs).catch((error) => {
      console.debug(
        "Failed to sync preferences to backend:",
        error instanceof Error ? error.message : String(error),
      );
    });
  } catch (error) {
    console.debug("Failed to save theme preferences:", error);
  }
}

/**
 * Sync preferences to backend asynchronously
 * Includes background images (can be large base64 strings)
 * Never throws - all errors are silently logged
 */
export async function syncPreferencesToBackend(
  prefs: ThemePreferences,
): Promise<void> {
  try {
    // Use Promise.race for timeout instead of AbortController
    const response = await Promise.race([
      fetch("/api/user-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          theme: prefs.theme,
          font: prefs.font,
          appearance: prefs.appearance,
          fontScale: prefs.fontScale,
          highContrast: prefs.highContrast,
          backgroundImageLight: prefs.backgroundImageLight,
          backgroundOpacityLight: prefs.backgroundOpacityLight,
          backgroundImageDark: prefs.backgroundImageDark,
          backgroundOpacityDark: prefs.backgroundOpacityDark,
        }),
      }),
      new Promise<Response>((_, reject) => {
        setTimeout(
          () =>
            reject(new Error("Theme preference sync timeout after 5 seconds")),
          5000,
        );
      }),
    ]);

    if (!response.ok && response.status !== 401) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    // Handle all errors silently - sync is asynchronous and best-effort
    // Network errors are expected in offline/backend-down scenarios
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.debug(
          "Theme preference sync timed out, continuing with local state",
        );
      } else if (error.message.includes("Failed to fetch")) {
        console.debug(
          "Theme preference sync failed (network error), continuing with local state",
        );
      } else {
        console.debug(
          "Failed to sync theme preferences to backend:",
          error.message,
        );
      }
    } else {
      console.debug("Failed to sync theme preferences to backend");
    }
    // Silent fallback - sync is asynchronous and non-critical
  }
}

/**
 * Sync background images to backend
 * Separate endpoint for handling large base64 data
 * Never throws - all errors are silently logged
 */
export async function syncBackgroundToBackend(
  backgroundImageLight?: string | null,
  backgroundImageDark?: string | null,
  backgroundOpacityLight?: number,
  backgroundOpacityDark?: number,
): Promise<void> {
  try {
    // Use Promise.race for timeout instead of AbortController
    const response = await Promise.race([
      fetch("/api/user-preferences/sync-background", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          backgroundImageLight,
          backgroundImageDark,
          backgroundOpacityLight,
          backgroundOpacityDark,
        }),
      }),
      new Promise<Response>((_, reject) => {
        setTimeout(
          () => reject(new Error("Background sync timeout after 5 seconds")),
          5000,
        );
      }),
    ]);

    if (!response.ok && response.status !== 401) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    // Handle all errors silently - sync is asynchronous and best-effort
    // Network errors are expected in offline/backend-down scenarios
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.debug("Background sync timed out, continuing with local state");
      } else if (error.message.includes("Failed to fetch")) {
        console.debug(
          "Background sync failed (network error), continuing with local state",
        );
      } else {
        console.debug("Failed to sync background to backend:", error.message);
      }
    } else {
      console.debug("Failed to sync background to backend");
    }
    // Silent fallback - sync is asynchronous and non-critical
  }
}

export function applyTheme(prefs: ThemePreferences): void {
  const theme = THEMES[prefs.theme];
  const font = FONTS[prefs.font];
  const isDark = prefs.appearance === "dark";

  const root = document.documentElement;
  const validScale = Math.max(0.8, Math.min(1.5, prefs.fontScale || 1.0));
  const background = isDark ? theme.colorsBackground.dark : theme.colorsBackground.light;
  const foreground = isDark ? theme.colorsText.dark : theme.colorsText.light;
  const primary = isDark ? theme.colorsPrimary.dark : theme.colorsPrimary.light;
  const secondary = isDark ? theme.colorsSecondary.dark : theme.colorsSecondary.light;
  const accent = isDark ? theme.colorsAccent.dark : theme.colorsAccent.light;
  const border = isDark ? theme.colorsBorder.dark : theme.colorsBorder.light;
  const surface = isDark ? theme.colorsSurface.dark : theme.colorsSurface.light;
  const card = surface;
  const popover = surface;
  const muted = `color-mix(in srgb, ${surface} 82%, ${foreground} 18%)`;
  const mutedForeground = `color-mix(in srgb, ${foreground} 68%, ${background} 32%)`;
  const primaryForeground = isDark ? "#0b0f14" : "#ffffff";
  const secondaryForeground = isDark ? "#0b0f14" : "#ffffff";
  const accentForeground = isDark ? "#0b0f14" : "#ffffff";
  const surfaceAlt = `color-mix(in srgb, ${surface} 84%, ${background} 16%)`;
  const bgAlt = `color-mix(in srgb, ${background} 90%, ${surface} 10%)`;
  const inputBorder = `color-mix(in srgb, ${border} 88%, ${foreground} 12%)`;
  const ring = `color-mix(in srgb, ${primary} 60%, ${accent} 40%)`;

  const fontFamily = font.fontFamily;
  const fontSizeClass = validScale < 0.9 ? "font-size-small" : validScale > 1.05 ? "font-size-large" : null;
  const fontClass = FONT_CLASS_NAMES[prefs.font];

  // Add transition class for smooth theme switch
  root.classList.add("theme-transition");

  // Keep theme and font classes in sync for the design system CSS
  removeClasses(root, [
    ...THEME_CLASS_NAMES,
    "light",
    "dark",
    "font-size-small",
    "font-size-large",
    ...Object.values(FONT_CLASS_NAMES).filter(
      (className): className is string => Boolean(className),
    ),
  ]);
  root.classList.add(`theme-${prefs.theme}`);
  root.classList.add(isDark ? "dark" : "light");
  if (fontClass) {
    root.classList.add(fontClass);
  }
  if (fontSizeClass) {
    root.classList.add(fontSizeClass);
  }

  // iter176 fix · actually apply the font-family — previously only the class
  // was added which no stylesheet listened to, so font-family dropdown did nothing.
  try {
    root.style.setProperty("--font-sans", fontFamily);
    root.style.setProperty("font-family", fontFamily);
    document.body?.style?.setProperty("font-family", fontFamily);
  } catch {}

  // iter181 · Apply font universally via injected <style> so EVERY element —
  // including inline-styled ones in legacy modules — inherits the chosen font.
  try { applyGlobalFontOverride(fontFamily); } catch {}

  // Apply variables for the shared Tailwind/shadcn system and EchoCoder token system.
  setVariables(root, {
    "--background": background,
    "--foreground": foreground,
    "--card": card,
    "--card-foreground": foreground,
    "--popover": popover,
    "--popover-foreground": foreground,
    "--primary": primary,
    "--primary-foreground": primaryForeground,
    "--secondary": secondary,
    "--secondary-foreground": secondaryForeground,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--accent": accent,
    "--accent-foreground": accentForeground,
    "--destructive": "#ef4444",
    "--destructive-foreground": "#ffffff",
    "--border": border,
    "--input": inputBorder,
    "--ring": ring,
    "--sidebar-background": surfaceAlt,
    "--sidebar-foreground": foreground,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-accent": bgAlt,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
    "--sidebar-ring": ring,
    "--bg": background,
    "--bg-soft": bgAlt,
    "--surface": surface,
    "--text": foreground,
    "--text-muted": mutedForeground,
    "--brand": primary,
    "--brand-2": secondary,
    "--brand-3": accent,
    "--accent": accent,
    "--accent-2": secondary,
    "--success": "#22c55e",
    "--warning": "#f59e0b",
    "--danger": "#ef4444",
    "--font-sans": fontFamily,
    "--font-family": fontFamily,
    "--font-scale": String(validScale),
    "--font-size-scale": String(validScale),
    "--panel-header-height": `calc(44px * ${validScale})`,
  });

  // Apply background images per light/dark mode
  const darkBg =
    prefs.backgroundImageDark &&
    prefs.backgroundImageDark !== BACKGROUND_NONE_SENTINEL
      ? prefs.backgroundImageDark
      : undefined;
  const lightBg =
    prefs.backgroundImageLight &&
    prefs.backgroundImageLight !== BACKGROUND_NONE_SENTINEL
      ? prefs.backgroundImageLight
      : undefined;

  if (isDark && darkBg) {
    const opacity = Math.max(0, Math.min(1, prefs.backgroundOpacityDark || 0));
    root.style.setProperty("--bg-image-dark", `url(${darkBg})`);
    root.style.setProperty("--bg-image-opacity-dark", String(opacity));
  } else {
    root.style.setProperty("--bg-image-dark", "none");
    root.style.setProperty("--bg-image-opacity-dark", "0");
  }

  if (!isDark && lightBg) {
    const opacity = Math.max(0, Math.min(1, prefs.backgroundOpacityLight || 0));
    root.style.setProperty("--bg-image-light", `url(${lightBg})`);
    root.style.setProperty("--bg-image-opacity-light", String(opacity));
  } else {
    root.style.setProperty("--bg-image-light", "none");
    root.style.setProperty("--bg-image-opacity-light", "0");
  }

  // Set data attribute for CSS selectors
  root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-font", prefs.font);
  root.setAttribute("data-appearance", prefs.appearance);

  // Update color-scheme for native elements
  document.documentElement.style.colorScheme = prefs.appearance;

  // Apply high contrast if enabled
  if (prefs.highContrast) {
    applyHighContrast(true);
  }

  // Remove transition class after animation completes (0.3s)
  setTimeout(() => {
    root.classList.remove("theme-transition");
  }, 350);
}

export function applyFontScale(scale: number): void {
  const validScale = Math.max(0.8, Math.min(1.5, scale));
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(validScale));
  root.style.setProperty("--font-size-scale", String(validScale));
  root.classList.remove("font-size-small", "font-size-large");
  if (validScale < 0.9) {
    root.classList.add("font-size-small");
  } else if (validScale > 1.05) {
    root.classList.add("font-size-large");
  }
}

export function applyBackgroundImages(params: {
  light?: string;
  dark?: string;
  opacityLight?: number;
  opacityDark?: number;
}): void {
  const root = document.documentElement;

  if (params.light) {
    const opacity = Math.max(0, Math.min(1, params.opacityLight || 0));
    root.style.setProperty("--bg-image-light", `url(${params.light})`);
    root.style.setProperty("--bg-image-opacity-light", String(opacity));

    // Validation: verify the variable was set
    const verify = getComputedStyle(root).getPropertyValue("--bg-image-light");
    const sizeKB = (params.light.length / 1024).toFixed(1);
    console.log(
      `[THEME] Light background applied (${sizeKB}KB). Verify:`,
      verify.substring(0, 50) + "...",
    );

    if (!verify || verify === "none") {
      console.warn("[THEME] Failed to set light background image");
    }
  } else if (params.light === null) {
    root.style.setProperty("--bg-image-light", "none");
    root.style.setProperty("--bg-image-opacity-light", "0");
    console.log("[THEME] Light background removed");
  }

  if (params.dark) {
    const opacity = Math.max(0, Math.min(1, params.opacityDark || 0));
    root.style.setProperty("--bg-image-dark", `url(${params.dark})`);
    root.style.setProperty("--bg-image-opacity-dark", String(opacity));

    // Validation: verify the variable was set
    const verify = getComputedStyle(root).getPropertyValue("--bg-image-dark");
    const sizeKB = (params.dark.length / 1024).toFixed(1);
    console.log(
      `[THEME] Dark background applied (${sizeKB}KB). Verify:`,
      verify.substring(0, 50) + "...",
    );

    if (!verify || verify === "none") {
      console.warn("[THEME] Failed to set dark background image");
    }
  } else if (params.dark === null) {
    root.style.setProperty("--bg-image-dark", "none");
    root.style.setProperty("--bg-image-opacity-dark", "0");
    console.log("[THEME] Dark background removed");
  }
}

export function applyHighContrast(enabled: boolean): void {
  const root = document.documentElement;

  if (enabled) {
    // Apply high contrast CSS class
    root.classList.add("high-contrast");
    root.style.setProperty("--high-contrast", "1");

    // Maximize contrast - use pure black and white extremes
    root.style.setProperty("--high-contrast-background", "#000000");
    root.style.setProperty("--high-contrast-foreground", "#ffffff");

    // Override text colors for maximum contrast
    const style = document.createElement("style");
    style.id = "high-contrast-overrides";
    if (document.getElementById("high-contrast-overrides")) {
      document.getElementById("high-contrast-overrides")?.remove();
    }
    style.textContent = `
      .high-contrast {
        --foreground: #ffffff;
        --background: #000000;
        --card: #111111;
        --card-foreground: #ffffff;
        --surface: #111111;
        --surface-alt: #1a1a1a;
        --muted: #cccccc;
        --muted-foreground: #ffffff;
        --border: #666666;
        --input: #1a1a1a;
        --primary: #ffff00;
        --primary-foreground: #000000;
        --secondary: #00ffff;
        --secondary-foreground: #000000;
        --accent: #ff00ff;
        --accent-foreground: #000000;
        --destructive: #ff0000;
        --destructive-foreground: #ffffff;
      }

      .high-contrast a {
        color: #ffff00;
        text-decoration: underline;
      }

      .high-contrast button, .high-contrast input, .high-contrast textarea, .high-contrast select {
        color: #ffffff;
        background-color: #000000;
        border: 2px solid #ffffff;
      }

      .high-contrast h1, .high-contrast h2, .high-contrast h3,
      .high-contrast h4, .high-contrast h5, .high-contrast h6 {
        color: #ffffff;
      }

      .high-contrast p {
        color: #ffffff;
      }
    `;
    document.head.appendChild(style);
  } else {
    // Remove high contrast CSS class
    root.classList.remove("high-contrast");
    root.style.removeProperty("--high-contrast");
    root.style.removeProperty("--high-contrast-background");
    root.style.removeProperty("--high-contrast-foreground");

    // Remove high contrast styles
    const style = document.getElementById("high-contrast-overrides");
    if (style) {
      style.remove();
    }
  }
}

export function importFontLinks(fonts: FontName[]): void {
  const uniqueFonts = new Set(fonts);

  uniqueFonts.forEach((fontName) => {
    const fontConfig = FONTS[fontName];
    if (fontConfig.googleFonts) {
      // Check if link already exists
      const linkId = `font-${fontName}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = fontConfig.googleFonts;
        document.head.appendChild(link);
      }
    }
  });
}

// Initialize theme on app load
export function initializeTheme(): void {
  const prefs = loadPreferences();

  // iter263 · If the Aurion global toggle has a saved mode, make it authoritative.
  // This prevents the legacy theme-manager default ("light") from fighting the
  // Aurion toggle on first paint after reload.
  try {
    const aurion = localStorage.getItem("echo-theme-mode");
    if (aurion === "dark" || aurion === "light") {
      prefs.appearance = aurion as AppearanceMode;
      savePreferences(prefs);
    }
  } catch {}

  // Import all font links
  importFontLinks(Object.keys(FONTS) as FontName[]);

  // Apply theme
  applyTheme(prefs);

  // Listen for theme changes
  window.addEventListener("theme-preferences-changed", ((event: any) => {
    if (event.detail) {
      applyTheme(event.detail);
      savePreferences(event.detail);
    }
  }) as EventListener);
}

// iter181 · Force every element — including inline-styled legacy modules —
// to inherit the selected font. Injects a single <style id="echo-global-font"> tag
// that uses !important to override hardcoded font-family declarations.
function applyGlobalFontOverride(fontFamily: string) {
  if (typeof document === "undefined") return;
  const id = "echo-global-font";
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = `
    html, body, button, input, select, textarea,
    [class*="font-"], [style*="font-family"] {
      font-family: ${fontFamily}, system-ui, -apple-system, "Segoe UI", sans-serif !important;
    }
    code, pre, kbd, samp, tt, [class*="mono"] {
      font-family: "SF Mono", Menlo, Monaco, "JetBrains Mono", "Courier New", monospace !important;
    }
  `;
}

/**
 * Sync theme preferences from backend when user logs in
 * This ensures consistent appearance across devices
 * Guaranteed to never throw - always falls back to local preferences
 */
export async function syncThemePreferencesFromBackend(): Promise<void> {
  try {
    let prefs: ThemePreferences | null = null;

    try {
      prefs = await fetchPreferencesFromBackend();
    } catch (fetchError) {
      console.debug(
        "Error fetching theme preferences from backend:",
        fetchError instanceof Error ? fetchError.message : String(fetchError),
      );
      // fetchPreferencesFromBackend should never throw, but handle just in case
      prefs = null;
    }

    // If fetch failed, use local preferences
    if (!prefs) {
      try {
        prefs = loadPreferences();
      } catch (loadError) {
        console.debug(
          "Error loading local theme preferences:",
          loadError instanceof Error ? loadError.message : String(loadError),
        );
        prefs = getDefaultPreferences();
      }
    }

    // Save to localStorage if we have valid preferences
    if (prefs) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch (storageError) {
        console.debug("Could not persist theme preferences to localStorage");
      }
    }

    // Apply theme if we have valid preferences
    if (prefs) {
      try {
        applyTheme(prefs);
      } catch (applyError) {
        console.debug(
          "Could not apply theme:",
          applyError instanceof Error ? applyError.message : String(applyError),
        );
      }
    }
  } catch (unexpectedError) {
    // Final safety net - should never reach here due to nested try-catch
    console.debug(
      "Unexpected error in syncThemePreferencesFromBackend:",
      unexpectedError instanceof Error
        ? unexpectedError.message
        : String(unexpectedError),
    );
  }
}
