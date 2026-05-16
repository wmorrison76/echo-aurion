import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage, useTranslation } from "@/context/LanguageContext";
import { languageOptions, type LanguageOption } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type LanguageMenuVariant = "card" | "compact";

export type LanguageMenuProps = {
  variant?: LanguageMenuVariant;
  isDark?: boolean;
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
};

export default function LanguageMenu({
  variant = "card",
  isDark,
  className,
  contentClassName,
  align = "end",
}: LanguageMenuProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const active = (languageOptions.find((option) => option.code === language) ??
    languageOptions[0]) as LanguageOption;

  const triggerClasses = cn(
    variant === "card"
      ? "flex h-full min-h-[4.25rem] w-full items-center justify-center rounded-2xl border px-4 py-3 shadow-inner transition-colors"
      : "inline-flex h-9 w-14 items-center justify-center rounded-full border text-2xl transition-colors",
    isDark
      ? variant === "card"
        ? "border-[#c8a97e]/40 bg-[#c8a97e]/30/30 text-white/80 hover:bg-[#c8a97e]/30/50"
        : "border-[#c8a97e]/40 bg-slate-900/70 text-white/80 hover:bg-slate-900/60"
      : variant === "card"
        ? "border-slate-200 bg-white/90 text-slate-800 hover:bg-white"
        : "border-slate-300 bg-white/90 text-slate-700 hover:bg-white",
    className,
  );

  const optionClasses = (selected: boolean) =>
    cn(
      "relative flex aspect-square items-center justify-center rounded-lg border text-3xl transition",
      isDark
        ? selected
          ? "border-[#c8a97e]/60 bg-[#c8a97e]/15 text-white/80"
          : "border-[#c8a97e]/25 bg-slate-950/70 text-[#c8a97e]/80 hover:bg-slate-900/70"
        : selected
          ? "border-slate-500 bg-slate-200 text-slate-900"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
    );

  const label = t("recipe.tools.language", "Change Language");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClasses}
          title={`${label} (${active.label})`}
          aria-label={`${label}, ${active.label}`}
        >
          <>
            <span className="sr-only">{`${label} (${active.label})`}</span>
            <span className="text-2xl leading-none" aria-hidden>
              {active.flag}
            </span>
          </>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          "w-72 p-4",
          isDark
            ? "bg-slate-900/95 text-white/80"
            : "bg-white/95 text-slate-900",
          contentClassName,
        )}
      >
        <div className="grid grid-cols-3 gap-2">
          {languageOptions.map((option) => {
            const selected = option.code === language;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => setLanguage(option.code)}
                className={optionClasses(selected)}
                aria-pressed={selected}
              >
                <span className="sr-only">{option.label}</span>
                <span className="text-2xl leading-none" aria-hidden>
                  {option.flag}
                </span>
                {selected ? (
                  <Check
                    className={cn(
                      "absolute right-1.5 top-1.5 h-4 w-4 rounded-full p-0.5 shadow",
                      isDark
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-900 text-white",
                    )}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
