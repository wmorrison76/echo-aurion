import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  className?: string;
};

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  ContentProps
>(function TooltipContent({ className = "", sideOffset = 4, ...props }, ref) {
  const base =
    "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs " +
    "text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 " +
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 " +
    "data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 " +
    "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 " +
    "data-[side=top]:slide-in-from-bottom-2";
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={(className ? className + " " : "") + base}
      {...props}
    />
  );
});
