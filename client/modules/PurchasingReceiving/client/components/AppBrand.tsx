import { cn } from "@/lib/utils";
interface AppBrandProps {
  className?: string;
  compact?: boolean;
}
export function AppBrand({ className, compact = false }: AppBrandProps) {
  const containerGap = compact ? "gap-3" : "gap-4";
  const outerShape = compact
    ? "h-12 w-12 rounded-[1.6rem]"
    : "h-14 w-14 rounded-[1.75rem]";
  const innerShape = compact
    ? "inset-[2px] rounded-[1.4rem]"
    : "inset-[3px] rounded-[1.55rem]";
  const monogramSize = compact ? "text-[0.68rem]" : "text-sm";
  const accentHeight = compact ? "h-7" : "h-8";
  const titleSize = compact ? "text-[0.74rem]" : "text-[0.78rem]";
  const subtitleOffset = compact ? "mt-1.5" : "mt-2";
  const subtitleSize = compact ? "text-[0.5rem]" : "text-[0.55rem]";
  return (
    <div className={cn("relative flex items-center", containerGap, className)}>
      {" "}
      <div
        className={cn(
          "relative overflow-hidden border border-sky-500/40 bg-gradient-to-br from-[#0b1d38] via-[#12325c] to-[#08162b] shadow-[0_0_26px_rgba(56,189,248,0.3)]",
          outerShape,
        )}
      >
        {" "}
        <div
          className={cn(
            "absolute bg-gradient-to-br from-[#030915] via-[#07182f] to-[#040d19]",
            innerShape,
          )}
        />{" "}
        <span
          className={cn(
            "relative z-10 flex h-full w-full items-center justify-center font-black uppercase tracking-[0.45em] text-sky-100",
            monogramSize,
          )}
        >
          {" "}
          PR{" "}
        </span>{" "}
        <div className="pointer-events-none absolute inset-y-2 left-1 w-[2px] rounded-full bg-gradient-to-b from-slate-100/0 via-sky-300/70 to-slate-200/0" />{" "}
      </div>{" "}
      <div className="flex flex-col text-xs uppercase tracking-[0.48em] text-slate-200">
        {" "}
        <div className={cn("flex items-center gap-3", compact && "gap-2.5")}>
          {" "}
          <div
            className={cn(
              "w-[2px] rounded-full bg-gradient-to-b from-sky-200 via-sky-400/80 to-cyan-200",
              accentHeight,
            )}
          />{" "}
          <div className="flex flex-col leading-[0.9]">
            {" "}
            <span
              className={cn(
                "bg-gradient-to-r from-white via-sky-100 to-sky-300 bg-clip-text font-semibold text-transparent",
                titleSize,
              )}
            >
              {" "}
              Purchasing{" "}
            </span>{" "}
            <span className="bg-gradient-to-r from-white/80 via-sky-100/60 to-slate-200 bg-clip-text text-[0.7rem] font-medium text-transparent">
              {" "}
              &{" "}
            </span>{" "}
            <span
              className={cn(
                "bg-gradient-to-r from-slate-100 via-sky-200/80 to-blue-200 bg-clip-text font-semibold text-transparent",
                titleSize,
              )}
            >
              {" "}
              Receiving{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <span
          className={cn(
            "tracking-[0.6em] text-slate-400",
            subtitleOffset,
            subtitleSize,
          )}
        >
          {" "}
          Echo Invoice Processing{" "}
        </span>{" "}
      </div>{" "}
    </div>
  );
}
