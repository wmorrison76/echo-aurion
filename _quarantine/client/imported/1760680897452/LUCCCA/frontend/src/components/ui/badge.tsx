import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant="default", ...props }: BadgeProps) {
  const v = {
    default: "bg-neutral-900 text-white",
    secondary: "bg-neutral-200 text-neutral-900",
    outline: "border border-neutral-300",
  }[variant];
  return <span className={cn("px-2 py-0.5 rounded text-xs", v, className)} {...props} />;
}
export default Badge;
