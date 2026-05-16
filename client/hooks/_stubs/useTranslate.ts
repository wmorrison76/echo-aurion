type UseTranslateOptions = {
  context?: string;
  skipCache?: boolean;
  skipTranslation?: boolean;
};

export function useTranslate() {
  const translate = async (text: string) => text;
  const translateBatch = async (texts: string[]) => texts;
  const translateObject = async <T extends Record<string, any>>(obj: T) => obj;
  const translateArray = async <T extends Record<string, any>>(items: T[]) => items;
  return {
    translate,
    translateBatch,
    translateObject,
    translateArray,
    isTranslating: false,
    currentLang: "en",
  };
}

export type { UseTranslateOptions };
