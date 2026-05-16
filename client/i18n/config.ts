export type LanguageCode = "en" | "es" | "fr" | "de" | "ja" | "pt";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
  flag: string;
};

export const defaultLanguage: LanguageCode = "en";

export const languageOptions: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
];

export const isLanguageCode = (
  value: string | null | undefined
): value is LanguageCode =>
  !!value && languageOptions.some((option) => option.code === value);
