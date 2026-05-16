import LanguageMenu from "./LanguageMenu";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  CircleDollarSign,
  FlaskConical,
  NotebookPen,
  Ruler,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AddRecipeToolsPanelProps = {
  onConvertUnits: () => void;
  onSaveSnapshot: () => void;
  onAltUnits?: () => void;
  onCycleCurrency: () => void;
  onOpenYieldLab: () => void;
  isDarkMode?: boolean;
  className?: string;
};

type ToolConfig = {
  key: string;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  handler: () => void;
};

export default function AddRecipeToolsPanel({
  onConvertUnits,
  onSaveSnapshot,
  onAltUnits,
  onCycleCurrency,
  onOpenYieldLab,
  isDarkMode,
  className,
}: AddRecipeToolsPanelProps) {
  const { t } = useTranslation();

  const cardClasses = cn(
    "rounded-3xl border p-5 shadow-lg transition-colors",
    isDarkMode
      ? "border-[#c8a97e]/40 bg-gradient-to-br from-neutral-950/40 via-slate-900/30 to-[#c8a97e]/30/40 text-white/80 shadow-[0_30px_80px_-40px_rgba(34,211,238,0.55)]"
      : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-800 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)]",
    className,
  );

  const buttonClasses = cn(
    "flex h-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold tracking-tight transition-all duration-200",
    isDarkMode
      ? "border-[#c8a97e]/30 bg-slate-900/40 text-white/80 hover:bg-slate-900/60 hover:border-[#c8a97e]"
      : "border-slate-200 bg-white/90 text-slate-800 hover:bg-white hover:shadow-sm",
  );

  const tools: ToolConfig[] = [
    {
      key: "convert",
      labelKey: "recipe.tools.convert",
      fallback: "Convert Units",
      icon: ArrowLeftRight,
      handler: onConvertUnits,
    },
    {
      key: "save",
      labelKey: "recipe.tools.saveSnapshot",
      fallback: "Save Snapshot",
      icon: NotebookPen,
      handler: onSaveSnapshot,
    },
    {
      key: "alt",
      labelKey: "recipe.tools.alt",
      fallback: "Alt Units",
      icon: Ruler,
      handler: onAltUnits ?? onConvertUnits,
    },
    {
      key: "currency",
      labelKey: "recipe.tools.currency",
      fallback: "Currency",
      icon: CircleDollarSign,
      handler: onCycleCurrency,
    },
    {
      key: "yield",
      labelKey: "recipe.tools.yield",
      fallback: "Yield Lab",
      icon: FlaskConical,
      handler: onOpenYieldLab,
    },
  ];

  return (
    <div className={cardClasses}>
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] opacity-90">
        {t("recipe.tools.title", "Add Recipe Tools")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <LanguageMenu
            variant="card"
            isDark={isDarkMode}
            className="w-full"
            contentClassName={isDarkMode ? "border border-[#b8976c]/40" : "border border-slate-200"}
          />
        </div>
        {tools.map((tool) => {
          const LabelIcon = tool.icon;
          return (
            <button
              key={tool.key}
              type="button"
              onClick={tool.handler}
              className={buttonClasses}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 via-transparent to-blue-400/25">
                  <LabelIcon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-left leading-tight">
                  {t(tool.labelKey, tool.fallback)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
