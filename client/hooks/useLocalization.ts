/**
 * useLocalization Hook
 * Provides regional formatting (numbers, dates, currency) and RTL support
 */

import { useMemo } from "react";
import { useI18n } from "@/i18n";

export interface LocalizationConfig {
  locale: string;
  numberFormat: Intl.NumberFormat;
  dateFormat: Intl.DateTimeFormat;
  currencyFormat: Intl.NumberFormat;
  isRTL: boolean;
  currencySymbol: string;
  currencyPosition: "before" | "after";
  dateSeparator: string;
  timeFormat: "12h" | "24h";
}

export function useLocalization(): LocalizationConfig {
  const { lang } = useI18n();

  return useMemo(() => {
    // Regional configurations
    const configs: Record<string, Partial<LocalizationConfig>> = {
      en: {
        locale: "en-US",
        currencySymbol: "$",
        currencyPosition: "before",
        dateSeparator: "/",
        timeFormat: "12h",
        isRTL: false,
      },
      es: {
        locale: "es-ES",
        currencySymbol: "€",
        currencyPosition: "after",
        dateSeparator: "/",
        timeFormat: "24h",
        isRTL: false,
      },
      fr: {
        locale: "fr-FR",
        currencySymbol: "€",
        currencyPosition: "after",
        dateSeparator: "/",
        timeFormat: "24h",
        isRTL: false,
      },
      de: {
        locale: "de-DE",
        currencySymbol: "€",
        currencyPosition: "after",
        dateSeparator: ".",
        timeFormat: "24h",
        isRTL: false,
      },
      it: {
        locale: "it-IT",
        currencySymbol: "€",
        currencyPosition: "after",
        dateSeparator: "/",
        timeFormat: "24h",
        isRTL: false,
      },
      pt: {
        locale: "pt-BR",
        currencySymbol: "R$",
        currencyPosition: "before",
        dateSeparator: "/",
        timeFormat: "24h",
        isRTL: false,
      },
      ja: {
        locale: "ja-JP",
        currencySymbol: "¥",
        currencyPosition: "before",
        dateSeparator: "/",
        timeFormat: "24h",
        isRTL: false,
      },
      zh: {
        locale: "zh-CN",
        currencySymbol: "¥",
        currencyPosition: "before",
        dateSeparator: "-",
        timeFormat: "24h",
        isRTL: false,
      },
      ar: {
        locale: "ar-SA",
        currencySymbol: "ر.س",
        currencyPosition: "after",
        dateSeparator: "/",
        timeFormat: "24h",
        isRTL: true,
      },
      nl: {
        locale: "nl-NL",
        currencySymbol: "€",
        currencyPosition: "after",
        dateSeparator: "-",
        timeFormat: "24h",
        isRTL: false,
      },
    };

    const config = configs[lang] || configs.en;
    const locale = config.locale || "en-US";

    // Create formatters
    const numberFormat = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const dateFormat = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const currencyFormat = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: locale === "en-US" ? "USD" : locale === "ja-JP" ? "JPY" : locale === "zh-CN" ? "CNY" : locale === "ar-SA" ? "SAR" : locale === "pt-BR" ? "BRL" : "EUR",
    });

    return {
      locale,
      numberFormat,
      dateFormat,
      currencyFormat,
      isRTL: config.isRTL || false,
      currencySymbol: config.currencySymbol || "$",
      currencyPosition: config.currencyPosition || "before",
      dateSeparator: config.dateSeparator || "/",
      timeFormat: config.timeFormat || "12h",
    };
  }, [lang]);
}

/**
 * Format number with regional formatting
 */
export function formatNumber(value: number, locale: string = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date with regional formatting
 */
export function formatDate(date: Date, locale: string = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Format currency with regional formatting
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}
