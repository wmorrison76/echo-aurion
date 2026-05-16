export type LanguageCode = "en" | "es" | "fr" | "de" | "ja" | "pt";

export const defaultLanguage: LanguageCode = "en";

export const languageOptions: { value: LanguageCode; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
];
