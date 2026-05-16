import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_WHITE_LABEL_CONFIG,
  type WhiteLabelCustomization,
} from "../../shared/whiteLabelConfig";

/**
 * White-label theming hook
 *
 * Fixes build errors caused by invalid syntax (dangling commas like `fn(arg, )`).
 * Applies theme values as CSS variables to :root.
 */
export function useWhiteLabel() {
  const [config, setConfig] = useState<WhiteLabelCustomization>(
    DEFAULT_WHITE_LABEL_CONFIG,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    let mounted = true;
    try {
      setLoading(true);
      setError(null);

      // Example: foo.example.com -> foo
      const domain = window.location.hostname.split(".")[0] ?? "default";

      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("White-label config request timeout"), 5000);

      try {
        const response = await fetch(`/api/white-label/config?domain=${domain}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch white-label configuration`);
        }

        const data = (await response.json()) as WhiteLabelCustomization;
        if (mounted) {
          setConfig(data);
          applyWhiteLabelStyles(data);
          // Cache for offline fallback
          localStorage.setItem("white-label-config-cache", JSON.stringify(data));
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn("[useWhiteLabel] Fetch failed:", message);

      // Try cached version first
      const cached = localStorage.getItem("white-label-config-cache");
      if (cached && mounted) {
        try {
          const cachedConfig = JSON.parse(cached) as WhiteLabelCustomization;
          setConfig(cachedConfig);
          applyWhiteLabelStyles(cachedConfig);
          setError(`Using cached config: ${message}`);
          return;
        } catch {
          // Cache is invalid, fall through to default
        }
      }

      // Fall back to default config
      if (mounted) {
        setError(message);
        setConfig(DEFAULT_WHITE_LABEL_CONFIG);
        applyWhiteLabelStyles(DEFAULT_WHITE_LABEL_CONFIG);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return useMemo(
    () => ({
      config,
      loading,
      error,
      refetch: fetchConfig,
    }),
    [config, loading, error, fetchConfig],
  );
}

export function useWhiteLabelAdmin() {
  const [configs, setConfigs] = useState<WhiteLabelCustomization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/white-label/configs");
      if (!response.ok) {
        throw new Error("Failed to fetch white-label configurations");
      }

      const data = (await response.json()) as WhiteLabelCustomization[];
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const createConfig = useCallback(
    async (partial: Partial<WhiteLabelCustomization>) => {
      const response = await fetch("/api/white-label/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!response.ok) {
        throw new Error("Failed to create configuration");
      }
      const newConfig = (await response.json()) as WhiteLabelCustomization;
      setConfigs((prev) => [...prev, newConfig]);
      return newConfig;
    },
    [],
  );

  const updateConfig = useCallback(
    async (id: string, updates: Partial<WhiteLabelCustomization>) => {
      const response = await fetch(`/api/white-label/configs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update configuration");
      }
      const updated = (await response.json()) as WhiteLabelCustomization;
      setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [],
  );

  const deleteConfig = useCallback(async (id: string) => {
    const response = await fetch(`/api/white-label/configs/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete configuration");
    }
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const activateConfig = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/white-label/configs/${id}/activate`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to activate configuration");
      }
      await fetchConfigs();
    },
    [fetchConfigs],
  );

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  return {
    configs,
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    activateConfig,
    refetch: fetchConfigs,
  };
}

function applyWhiteLabelStyles(config: WhiteLabelCustomization) {
  const root = document.documentElement;

  // Colors
  Object.entries(config.colors).forEach(([key, value]) => {
    const varName = `--color-${key
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()}`;
    root.style.setProperty(varName, value);
  });

  // Typography
  Object.entries(config.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  Object.entries(config.typography.fontWeight).forEach(([key, value]) => {
    root.style.setProperty(`--font-weight-${key}`, String(value));
  });
  root.style.setProperty("--font-family", config.typography.fontFamily);
  root.style.setProperty(
    "--font-family-heading",
    config.typography.headingFont,
  );

  // Spacing
  Object.entries(config.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // SECURITY: Apply custom CSS if provided (sanitized)
  if (config.customCSS) {
    let styleElement = document.getElementById(
      "white-label-custom-styles",
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = "white-label-custom-styles";
      styleElement.type = "text/css";
      document.head.appendChild(styleElement);
    }

    const sanitizedCSS = sanitizeCSSContent(config.customCSS);

    // Prefer CSSStyleSheet insertRule (safer than innerHTML).
    try {
      if (styleElement.sheet) {
        while (styleElement.sheet.cssRules.length > 0) {
          styleElement.sheet.deleteRule(0);
        }
        const rules = sanitizedCSS
          .split("}")
          .map((r) => r.trim())
          .filter(Boolean);

        rules.forEach((rule) => {
          try {
            styleElement!.sheet!.insertRule(
              `${rule}}`,
              styleElement!.sheet!.cssRules.length,
            );
          } catch {
            // Skip invalid rules silently
          }
        });
      } else {
        styleElement.textContent = sanitizedCSS;
      }
    } catch {
      // Fallback to textContent (still safer than innerHTML)
      styleElement.textContent = sanitizedCSS;
    }
  }

  // Document metadata
  if (config.branding.appName) {
    document.title = config.branding.appName;
  }
  if (config.branding.faviconUrl) {
    let favicon = document.querySelector('link[rel="icon"]') as
      | HTMLLinkElement
      | null;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = config.branding.faviconUrl;
  }
}

/**
 * Sanitize CSS content to remove obvious XSS / injection vectors.
 * NOTE: This is intentionally conservative; for stronger guarantees,
 * consider a dedicated CSS sanitizer library.
 */
function sanitizeCSSContent(css: string): string {
  return css
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/@import/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/vbscript:/gi, "");
}
