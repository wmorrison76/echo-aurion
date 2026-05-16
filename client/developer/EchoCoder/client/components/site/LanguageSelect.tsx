import { useI18n, Lang } from "@/i18n";

const FLAGS: Record<Lang, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  ja: "🇯🇵",
  pt: "🇧🇷",
  it: "🇮🇹",
} as const;
const ORDER: Lang[] = ["en", "es", "fr", "de", "ja", "pt", "it"];

export default function LanguageSelect() {
  const { lang, setLang } = useI18n();
  return (
    <div className="relative">
      <button
        aria-label="Change language"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-base leading-none shadow-sm transition hover:bg-accent/30"
        onClick={() => {
          const idx = ORDER.indexOf(lang);
          const next = ORDER[(idx + 1) % ORDER.length];
          setLang(next);
          // Force a re-render of all components
          window.location.reload();
        }}
      >
        {FLAGS[lang]}
      </button>
    </div>
  );
}
