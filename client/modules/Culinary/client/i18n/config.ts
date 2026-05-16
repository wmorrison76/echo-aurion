/** Language codes for Culinary menu-packs and LanguageContext (BCP47-style). */
export type LanguageCode =
  | "en-US"
  | "fr-FR"
  | "it-IT"
  | "es-ES"
  | "pt-BR"
  | "de-DE";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
  flag: string;
};

export const defaultLanguage: LanguageCode = "en-US";

export const languageOptions: LanguageOption[] = [
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "de-DE", label: "Deutsch", flag: "🇩🇪" },
];

export const isLanguageCode = (
  value: string | null | undefined,
): value is LanguageCode =>
  !!value && languageOptions.some((option) => option.code === value);
