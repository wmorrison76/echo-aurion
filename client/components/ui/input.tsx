import React, { useId } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { controlOutlineClasses } from "./control-styles";

const inputVariants = cva(
  "flex h-10 w-full rounded-md px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: controlOutlineClasses,
        ghost: "border-transparent bg-transparent focus-visible:ring-0",
        underline: "rounded-none border-b border-primary/40 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {
  enableSuggestions?: boolean;
  suggestionScope?: string[];
  minSuggestionQueryLength?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      className,
      type,
      variant,
      enableSuggestions: _enableSuggestions,
      suggestionScope: _suggestionScope,
      minSuggestionQueryLength: _minSuggestionQueryLength,
      ...props
    },
    ref,
  ) => {
    const defaultId = useId();
    const inputId = id || defaultId;
    const inputName = props.name || inputId;

    return (
      <input
        id={inputId}
        name={inputName}
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
