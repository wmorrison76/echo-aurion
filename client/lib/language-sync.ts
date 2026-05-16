/**
 * Language Synchronization System
 * Ensures all modules respond to language changes in real-time
 * Handles cross-module language state synchronization
 */

import type { Lang } from "@/i18n";

export type LanguageMapping = {
  core: Lang;
  culinary: string;
  schedule: string;
  pastry: string;
};

/**
 * Maps core language codes to module-specific codes
 */
const LANGUAGE_MAP: Record<Lang, LanguageMapping> = {
  en: {
    core: "en",
    culinary: "en-US",
    schedule: "en",
    pastry: "en-US",
  },
  es: {
    core: "es",
    culinary: "es-ES",
    schedule: "es",
    pastry: "es-ES",
  },
  fr: {
    core: "fr",
    culinary: "fr-FR",
    schedule: "fr",
    pastry: "fr-FR",
  },
  de: {
    core: "de",
    culinary: "de-DE",
    schedule: "de",
    pastry: "de-DE",
  },
  ja: {
    core: "ja",
    culinary: "en-US", // Fallback to English if not supported
    schedule: "en",
    pastry: "en-US",
  },
  pt: {
    core: "pt",
    culinary: "pt-BR",
    schedule: "pt",
    pastry: "pt-BR",
  },
};

/**
 * Synchronizes language across all storage mechanisms
 */
export function syncLanguageToStorage(lang: Lang): void {
  const mapping = LANGUAGE_MAP[lang];

  try {
    // Core language storage
    localStorage.setItem("lang", lang);
    localStorage.setItem("luccca_lang", lang);

    // Module-specific storage
    localStorage.setItem("app:language", mapping.culinary);
    localStorage.setItem("culinary:language", mapping.culinary);
    localStorage.setItem("pastry:language", mapping.pastry);
    localStorage.setItem("schedule:language", mapping.schedule);

    console.log(`[LanguageSync] Synced language to ${lang}`, mapping);
  } catch (error) {
    console.error("[LanguageSync] Failed to sync language to storage:", error);
  }
}

/**
 * Dispatches language change events to all systems
 */
export function dispatchLanguageChangeEvents(lang: Lang): void {
  const mapping = LANGUAGE_MAP[lang];

  try {
    // Core i18n events
    window.dispatchEvent(
      new CustomEvent("i18n:lang", { detail: lang })
    );

    window.dispatchEvent(
      new CustomEvent("i18n:language-changed", {
        detail: { lang, langMap: mapping.culinary },
      })
    );

    // Module-specific events
    window.dispatchEvent(
      new CustomEvent("app:language", { detail: mapping.culinary })
    );

    window.dispatchEvent(
      new CustomEvent("culinary:language-change", { detail: mapping.culinary })
    );

    window.dispatchEvent(
      new CustomEvent("pastry:language-change", { detail: mapping.pastry })
    );

    window.dispatchEvent(
      new CustomEvent("schedule:language-change", { detail: mapping.schedule })
    );

    // Global language change event for any module
    window.dispatchEvent(
      new CustomEvent("global:language-change", {
        detail: { core: lang, mappings: mapping },
      })
    );

    console.log(`[LanguageSync] Dispatched language change events for ${lang}`);
  } catch (error) {
    console.error("[LanguageSync] Failed to dispatch language events:", error);
  }
}

/**
 * Complete language change handler
 * Call this whenever the user changes language
 */
export function changeLanguage(lang: Lang): void {
  syncLanguageToStorage(lang);
  dispatchLanguageChangeEvents(lang);
}

/**
 * Gets the current language from storage with fallback
 */
export function getCurrentLanguage(): Lang {
  try {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored && ["en", "es", "fr", "de", "ja", "pt"].includes(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("[LanguageSync] Failed to read language from storage:", error);
  }
  return "en";
}

/**
 * Initialize language sync system
 * Sets up listeners for storage events and cross-tab sync
 */
export function initLanguageSync(): void {
  // Listen for storage events from other tabs
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === "lang" && e.newValue) {
      const newLang = e.newValue as Lang;
      if (["en", "es", "fr", "de", "ja", "pt"].includes(newLang)) {
        dispatchLanguageChangeEvents(newLang);
      }
    }
  });

  // Listen for custom language change events
  window.addEventListener("i18n:lang", ((e: CustomEvent) => {
    const lang = e.detail as Lang;
    if (lang && ["en", "es", "fr", "de", "ja", "pt"].includes(lang)) {
      syncLanguageToStorage(lang);
    }
  }) as EventListener);

  console.log("[LanguageSync] Language sync system initialized");
}

/**
 * Hook for React components to listen to language changes
 * Returns a cleanup function to remove event listeners
 */
export function useLanguageSync(callback: (lang: Lang) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = ((e: CustomEvent) => {
    const detail = e.detail;
    if (detail?.core) {
      callback(detail.core as Lang);
    } else if (typeof detail === "string") {
      callback(detail as Lang);
    }
  }) as EventListener;

  window.addEventListener("global:language-change", handler);
  window.addEventListener("i18n:lang", handler);

  return () => {
    window.removeEventListener("global:language-change", handler);
    window.removeEventListener("i18n:lang", handler);
  };
}
