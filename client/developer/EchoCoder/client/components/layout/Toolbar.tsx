import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useI18n, type Lang } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sun, Moon } from "lucide-react";

interface ToolbarProps {
  className?: string;
}

const colorSchemes = [
  { id: "cyan", label: "Cyan", hex: "#00d4ff" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "emerald", label: "Emerald", hex: "#10b981" },
  { id: "violet", label: "Violet", hex: "#8b5cf6" },
  { id: "rose", label: "Rose", hex: "#f43f5e" },
];

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
];

export default function Toolbar({ className }: ToolbarProps) {
  const { lang, setLang } = useI18n();
  const { theme, colorScheme, setTheme, setColorScheme, toggleTheme } = useTheme();

  const handleLanguageChange = (code: string) => {
    if (['en', 'es', 'fr', 'pt', 'it'].includes(code)) {
      setLang(code as Lang);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4",
        "bg-card/50 backdrop-blur border-b border-border/40",
        "fixed top-0 right-0 left-0 z-40 md:relative md:z-auto md:top-auto md:right-auto md:left-auto md:border-b-0 md:border-l",
        className
      )}
    >
      {/* Color Picker */}
      <div className="flex items-center gap-2">
        {colorSchemes.map(({ id, hex }) => (
          <button
            key={id}
            onClick={() => handleColorSchemeChange(id)}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-all",
              colorScheme === id ? "border-white ring-2 ring-offset-2" : "border-border"
            )}
            style={{ backgroundColor: hex }}
            title={id}
          />
        ))}
      </div>

      {/* Theme Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="hidden md:inline-flex"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* Language Selector */}
      <Select value={lang} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map(({ code, label, flag }) => (
            <SelectItem key={code} value={code}>
              <span className="flex items-center gap-2">
                <span>{flag}</span>
                <span>{label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
