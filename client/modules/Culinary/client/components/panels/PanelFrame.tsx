import { type ReactNode, useMemo } from "react";
import { Minus, PanelsTopLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePanelManager } from "@/hooks/use-panel-manager";

const baseSurface =
  "relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white/95 p-4 shadow-[0_28px_85px_-58px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-colors dark:border-[#c8a97e]/15 dark:bg-slate-950/75 dark:text-white/80";

const headerTone =
  "flex items-start justify-between gap-3 border-b border-slate-200/60 pb-3 dark:border-[#c8a97e]/15";

const chipTone =
  "inline-flex items-center justify-center rounded-full border border-slate-200/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:border-[#c8a97e]/15 dark:text-[#c8a97e]";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900/30 dark:text-[#c8a97e] dark:hover:border-[#c8a97e]/30 dark:hover:bg-[#c8a97e]-500/10 dark:hover:text-white/80";

type PanelFrameProps = {
  panelId: string;
  title: string;
  subtitle?: string;
  areas?: string[];
  toolbar?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function PanelFrame({
  panelId,
  title,
  subtitle,
  areas,
  toolbar,
  className,
  children,
}: PanelFrameProps) {
  const panelManager = usePanelManager();

  const normalizedAreas = useMemo(() => {
    if (!areas?.length) return [] as string[];
    return Array.from(new Set(areas.map((area) => area.trim().toUpperCase())));
  }, [areas]);

  return (
    <section className={cn(baseSurface, "text-slate-700 dark:text-white/80", className)}>
      <header className={headerTone}>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.42em] text-slate-700 dark:text-[#c8a97e]/80">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs leading-relaxed text-slate-500 dark:text-[#c8a97e]/80">{subtitle}</p>
          ) : null}
          {normalizedAreas.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {normalizedAreas.map((area) => (
                <span key={area} className={chipTone}>
                  {area}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {toolbar}
          <button
            type="button"
            className={iconButton}
            onClick={() => panelManager.minimize(panelId)}
            aria-label="Minimize panel"
            title="Minimize panel"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => panelManager.dock(panelId)}
            aria-label="Dock panel"
            title="Dock panel"
          >
            <PanelsTopLeft className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto py-3 text-sm leading-relaxed text-slate-600 dark:text-[#c8a97e]/80/90">
        {children}
      </div>
    </section>
  );
}
