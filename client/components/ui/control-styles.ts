import { cn } from "@/lib/utils";

export const controlOutlineClasses =
  "border border-primary/45 bg-background/70 shadow-[0_0_0_1px_rgba(56,189,248,0.35)] transition-colors transition-shadow duration-150 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const controlSurfaceClasses =
  "border border-primary/40 bg-popover/80 shadow-[0_0_0_1px_rgba(56,189,248,0.25)] backdrop-blur-sm";

export const mergeControlClasses = (...classes: (string | undefined)[]) =>
  cn(controlOutlineClasses, ...classes);
