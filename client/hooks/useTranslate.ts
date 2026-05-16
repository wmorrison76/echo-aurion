import { useI18n } from "@/i18n";
import { useCallback, useState, useEffect } from "react";

interface UseTranslateOptions {
  context?: string;
  skipCache?: boolean;
  skipTranslation?: boolean;
}

export function useTranslate() {
  const i18n = useI18n();
  const [isTranslating, setIsTranslating] = useState(false);

  /**
   * Translate a single text
   */
  const translate = useCallback(
    async (text: string, options?: UseTranslateOptions) => {
      if (!text) return text;

      setIsTranslating(true);
      try {
        const result = await i18n.translate(text, options);
        return result;
      } finally {
        setIsTranslating(false);
      }
    },
    [i18n],
  );

  /**
   * Translate multiple texts efficiently
   */
  const translateBatch = useCallback(
    async (texts: string[], options?: UseTranslateOptions) => {
      if (!texts || texts.length === 0) return texts;

      setIsTranslating(true);
      try {
        const results = await i18n.translateBatch(texts, options);
        return results;
      } finally {
        setIsTranslating(false);
      }
    },
    [i18n],
  );

  /**
   * Auto-translate an object's string values
   */
  const translateObject = useCallback(
    async <T extends Record<string, any>>(
      obj: T,
      options?: UseTranslateOptions,
    ): Promise<T> => {
      if (!obj) return obj;

      const entries = Object.entries(obj);
      const values = entries.map((e) => e[1]);
      const stringValues = values.filter(
        (v) => typeof v === "string",
      ) as string[];

      if (stringValues.length === 0) {
        return obj;
      }

      setIsTranslating(true);
      try {
        const translatedValues = await i18n.translateBatch(
          stringValues,
          options,
        );

        const result = { ...obj };
        let stringIndex = 0;

        for (const [key, value] of entries) {
          if (typeof value === "string") {
            (result as any)[key] = translatedValues[stringIndex];
            stringIndex++;
          }
        }

        return result;
      } finally {
        setIsTranslating(false);
      }
    },
    [i18n],
  );

  /**
   * Auto-translate array of objects
   */
  const translateArray = useCallback(
    async <T extends Record<string, any>>(
      items: T[],
      options?: UseTranslateOptions,
    ): Promise<T[]> => {
      if (!items || items.length === 0) return items;

      setIsTranslating(true);
      try {
        const translated = await Promise.all(
          items.map((item) => translateObject(item, options)),
        );
        return translated;
      } finally {
        setIsTranslating(false);
      }
    },
    [translateObject],
  );

  return {
    translate,
    translateBatch,
    translateObject,
    translateArray,
    isTranslating,
    currentLang: i18n.lang,
  };
}

/**
 * Hook to automatically translate text when language changes
 */
export function useAutoTranslate(
  text: string | null,
  options?: UseTranslateOptions,
) {
  const { translate } = useTranslate();
  const [translatedText, setTranslatedText] = useState(text || "");

  useEffect(() => {
    if (!text) {
      setTranslatedText("");
      return;
    }

    let isMounted = true;

    translate(text, options).then((result) => {
      if (isMounted) {
        setTranslatedText(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [text, options, translate]);

  return translatedText;
}
