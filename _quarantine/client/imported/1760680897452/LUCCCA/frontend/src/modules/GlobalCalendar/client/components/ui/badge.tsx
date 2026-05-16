import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pill-box",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25 shadow-sm",
        secondary:
          "border-secondary/30 bg-secondary/15 text-secondary-foreground hover:bg-secondary/25 shadow-sm",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25 shadow-sm",
        outline: "text-foreground border-border/50 bg-background/50 hover:bg-background/80 shadow-sm",
        success:
          "border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 shadow-sm",
        warning:
          "border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/25 shadow-sm",
        info:
          "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Status-specific badge components for enhanced light mode visibility
function StatusBadge({
  status,
  className,
  ...props
}: {
  status: 'confirmed' | 'pending' | 'cancelled' | 'in-progress';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const statusClasses = {
    confirmed: "status-badge-confirmed",
    pending: "status-badge-pending",
    cancelled: "status-badge-cancelled",
    'in-progress': "status-badge-in-progress"
  };

  return (
    <div
      className={cn(
        "pill-box status-badge",
        statusClasses[status],
        className
      )}
      {...props}
    />
  );
}

function PriorityBadge({
  priority,
  className,
  ...props
}: {
  priority: 'high' | 'medium' | 'low';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const priorityClasses = {
    high: "priority-badge-high",
    medium: "priority-badge-medium",
    low: "priority-badge-low"
  };

  return (
    <div
      className={cn(
        "pill-box status-badge",
        priorityClasses[priority],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants, StatusBadge, PriorityBadge };
