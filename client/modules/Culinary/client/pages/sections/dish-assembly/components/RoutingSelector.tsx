import React from "react";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type RoutingOption = {
  id: string;
  label: string;
  tag?: string;
  description?: string;
  meta?: string;
  recommended?: boolean;
};

type RoutingSelectorProps = {
  options: RoutingOption[];
  selectedIds: string[];
  onToggle: (id: string, shiftKey: boolean) => void;
  emptyMessage: string;
  className?: string;
};

export const RoutingSelector: React.FC<RoutingSelectorProps> = ({
  options,
  selectedIds,
  onToggle,
  emptyMessage,
  className,
}) => {
  if (!options.length) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center px-3 py-6 text-center text-xs uppercase tracking-[0.32em] text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <Tooltip key={option.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    onToggle(option.id, event.shiftKey);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      onToggle(option.id, event.shiftKey);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-primary/30 bg-background/80 text-muted-foreground hover:border-primary/50 hover:text-primary",
                    option.recommended && !isSelected
                      ? "border-dashed border-primary/60 text-primary"
                      : null,
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="max-w-[12rem] truncate">{option.label}</span>
                  {option.tag ? (
                    <Badge className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
                      {option.tag}
                    </Badge>
                  ) : null}
                  {option.recommended && !isSelected ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
                      Rec
                    </span>
                  ) : null}
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-opacity duration-150",
                      isSelected
                        ? "opacity-100 text-primary-foreground"
                        : "opacity-0 text-primary-foreground",
                    )}
                    aria-hidden
                  />
                </button>
              </TooltipTrigger>
              {(option.description || option.meta) && (
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="max-w-xs text-xs leading-relaxed"
                >
                  <div className="font-semibold text-foreground">{option.label}</div>
                  {option.tag ? (
                    <div className="mt-1 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                      {option.tag}
                    </div>
                  ) : null}
                  {option.meta ? (
                    <div className="mt-1 text-muted-foreground">{option.meta}</div>
                  ) : null}
                  {option.description ? (
                    <p className="mt-2 text-muted-foreground">{option.description}</p>
                  ) : null}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export type RoutingSummaryItem = {
  id: string;
  label: string;
  tag?: string;
  description?: string;
  meta?: string;
};

type SelectedRoutingSummaryProps = {
  items: RoutingSummaryItem[];
  emptyMessage: string;
  className?: string;
};

export const SelectedRoutingSummary: React.FC<SelectedRoutingSummaryProps> = ({
  items,
  emptyMessage,
  className,
}) => {
  if (!items.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-primary/30 px-3 py-3 text-xs text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-muted/20 px-3 py-3",
          className,
        )}
      >
        {items.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="flex cursor-help items-center gap-1.5 rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="max-w-[11rem] truncate">{item.label}</span>
                {item.tag ? (
                  <span className="text-[9px] font-medium uppercase tracking-[0.34em] text-muted-foreground">
                    {item.tag}
                  </span>
                ) : null}
              </span>
            </TooltipTrigger>
            {(item.description || item.meta) && (
              <TooltipContent
                side="bottom"
                align="center"
                className="max-w-xs text-xs leading-relaxed"
              >
                <div className="font-semibold text-foreground">{item.label}</div>
                {item.tag ? (
                  <div className="mt-1 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                    {item.tag}
                  </div>
                ) : null}
                {item.meta ? (
                  <div className="mt-1 text-muted-foreground">{item.meta}</div>
                ) : null}
                {item.description ? (
                  <p className="mt-2 text-muted-foreground">{item.description}</p>
                ) : null}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
