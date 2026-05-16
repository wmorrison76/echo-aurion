import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // macOS/iOS-style Blue button with subtle elevation
        default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_16px_rgba(0,0,0,0.08)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(0,0,0,0.08)] hover:bg-destructive/90",
        // Segmented/pill control used across toolbars
        outline:
          "border border-black/10 bg-white text-slate-900 backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.06)] hover:bg-white/90 dark:bg-white dark:text-slate-900",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.06)] hover:bg-secondary/80",
        // Minimal text button
        ghost: "text-foreground hover:bg-black/5 dark:hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
