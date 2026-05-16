import React from "react";
import { cn } from "@/lib/utils";

type PanelFrameProps = {
  title: string;
  status?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export function PanelFrame({
  title,
  status,
  actions,
  children,
  className,
  headerClassName,
}: PanelFrameProps) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <div
        className={cn(
          "flex items-center justify-between border-b border-border/70 px-6 py-4",
          headerClassName,
        )}
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {status && <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{status}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
    </div>
  );
}
