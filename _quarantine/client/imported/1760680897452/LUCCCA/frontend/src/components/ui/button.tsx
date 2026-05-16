import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "secondary";
type Size = "default" | "sm" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const v = {
      default: "bg-neutral-900 text-white hover:bg-neutral-800",
      outline: "border border-neutral-300 hover:bg-neutral-50",
      ghost: "hover:bg-neutral-100",
      secondary: "bg-neutral-200 text-neutral-900 hover:bg-neutral-300",
    }[variant];

    const s = {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      icon: "h-8 w-8 p-0 grid place-items-center",
    }[size];

    return (
      <button ref={ref} className={cn("rounded-md", v, s, className)} {...props} />
    );
  }
);
Button.displayName = "Button";
export default Button;
