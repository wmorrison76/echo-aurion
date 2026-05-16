import React, { useEffect, useState } from "react";
import { TranslationManager } from "./TranslationManager";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/glass";

interface TranslationControlsProps {
  onLanguageChange?: (languageCode: string) => void;
}

interface SupportedLanguage {
  code: string;
  name: string;
}

export const TranslationControls: React.FC<TranslationControlsProps> = ({
  onLanguageChange,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [supportedLanguages, setSupportedLanguages] = useState<
    SupportedLanguage[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const translationManager = TranslationManager.getInstance();

  useEffect(() => {
    const languages = translationManager.getSupportedLanguages();
    if (languages.length > 0) {
      setSupportedLanguages(languages);
      setIsLoading(false);
    } else {
      setSupportedLanguages([
        { code: "en", name: "English" },
        { code: "es", name: "Spanish" },
        { code: "fr", name: "French" },
        { code: "de", name: "German" },
        { code: "it", name: "Italian" },
        { code: "pt", name: "Portuguese" },
        { code: "ru", name: "Russian" },
        { code: "ja", name: "Japanese" },
        { code: "ko", name: "Korean" },
        { code: "zh-CN", name: "Chinese (Simplified)" },
        { code: "ar", name: "Arabic" },
        { code: "hi", name: "Hindi" },
      ]);
      setIsLoading(false);
    }

    const unsubscribe = translationManager.onLanguageChange((lang) => {
      setCurrentLanguage(lang);
    });

    return unsubscribe;
  }, [translationManager]);

  const handleLanguageChange = (languageCode: string) => {
    if (languageCode !== currentLanguage) {
      translationManager.setCurrentLanguage(languageCode);
      setCurrentLanguage(languageCode);
      onLanguageChange?.(languageCode);
    }
  };

  const currentLanguageName =
    supportedLanguages.find((lang) => lang.code === currentLanguage)?.name ||
    "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={isLoading}
          title="Select translation language"
        >
          <Globe size={16} />
          <span className="hidden sm:inline text-xs">{currentLanguageName}</span>
          <ChevronDown size={14} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
        {supportedLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={cn(
              "cursor-pointer",
              currentLanguage === language.code && "bg-primary text-primary-foreground",
            )}
          >
            <span className="text-xs">{language.name}</span>
            {currentLanguage === language.code && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
