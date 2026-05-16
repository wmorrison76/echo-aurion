import React from "react";

interface PanelFrameProps {
  title: string;
  subtitle?: string;
  status?: string;
  chrome?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function PanelFrame({
  title,
  subtitle,
  status,
  chrome,
  className = "",
  children,
}: PanelFrameProps) {
  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {chrome && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {status && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {status}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
