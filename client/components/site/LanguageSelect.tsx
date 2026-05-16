import { useI18n, Lang } from "@/i18n";
import { cn } from "@/lib/glass";
import { useState, useRef, useEffect } from "react";

const FLAGS: Record<Lang, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  ja: "🇯🇵",
  pt: "🇧🇷",
} as const;

const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  pt: "Português",
} as const;

const LANGUAGES: Lang[] = ["en", "es", "fr", "de", "ja", "pt"];

interface LanguageSelectProps {
  compact?: boolean;
}

export default function LanguageSelect({ compact }: LanguageSelectProps) {
  const { lang, setLang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = (newLang: Lang) => {
    setLang(newLang);
    // The i18n provider will handle all event dispatching via language-sync
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label="Change language"
        className={cn(
          "flex items-center justify-center rounded-full bg-background/70 text-base leading-none shadow-sm transition hover:bg-accent/30",
          compact ? "h-10 w-10" : "h-7 w-7",
        )}
        onClick={() => setIsOpen(!isOpen)}
        title={LANGUAGE_NAMES[lang]}
      >
        {FLAGS[lang]}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map((availLang) => (
            <button
              key={availLang}
              onClick={() => handleLanguageChange(availLang)}
              className={cn(
                "w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2",
                lang === availLang
                  ? "bg-primary/20 text-foreground font-medium"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              <span className="text-base">{FLAGS[availLang]}</span>
              <span>{LANGUAGE_NAMES[availLang]}</span>
              {lang === availLang && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
