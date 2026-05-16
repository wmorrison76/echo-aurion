import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { defaultLanguage, isLanguageCode, languageOptions, type LanguageCode, type LanguageOption } from "@/i18n/config";
import { dictionaries, type TranslationDictionary } from "@/i18n/dictionaries";

export type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  options: LanguageOption[];
  t: (key: string, fallback?: string, values?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") {
      return defaultLanguage;
    }
    try {
      const stored = window.localStorage.getItem("app:language");
      if (isLanguageCode(stored)) {
        return stored;
      }
    } catch {}
    return defaultLanguage;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", language);
    }
    try {
      window.localStorage.setItem("app:language", language);
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:language", { detail: language }));
    }
  }, [language]);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
  }, []);

  const dictionary = useMemo(() => dictionaries[language] ?? dictionaries[defaultLanguage], [language]);

  const translate = useCallback(
    (key: string, fallback?: string, values?: Record<string, string | number>) => {
      let text = dictionaries[language]?.[key]
        ?? dictionaries[defaultLanguage]?.[key]
        ?? fallback
        ?? key;
      if (values) {
        for (const [token, value] of Object.entries(values)) {
          const pattern = new RegExp(`\\{${token}\\}`, "g");
          text = text.replace(pattern, String(value));
        }
      }
      return text;
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, options: languageOptions, t: translate, dictionary }),
    [language, dictionary, setLanguage, translate],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return { language: ctx.language, setLanguage: ctx.setLanguage, options: ctx.options };
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return { t: ctx.t, language: ctx.language, dictionary: ctx.dictionary };
};
