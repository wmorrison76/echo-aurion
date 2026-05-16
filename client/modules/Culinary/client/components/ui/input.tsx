import * as React from "react";

import type { FuzzySuggestionScope } from "@/hooks/use-fuzzy-suggestions";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  enableSuggestions?: boolean;
  suggestionScope?: FuzzySuggestionScope | FuzzySuggestionScope[];
  suggestionLimit?: number;
  suggestionThreshold?: number;
  minSuggestionQueryLength?: number;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      enableSuggestions = true,
      suggestionScope,
      suggestionLimit,
      suggestionThreshold,
      minSuggestionQueryLength,
      ...props
    },
    ref,
  ) => {
    const dataAttributes: Record<string, string> = {};

    if (enableSuggestions) {
      if (suggestionScope) {
        const scopeValue = Array.isArray(suggestionScope)
          ? suggestionScope.join(",")
          : suggestionScope;
        dataAttributes["data-fuzzy-scope"] = scopeValue;
      }
      if (suggestionLimit != null) {
        dataAttributes["data-fuzzy-limit"] = String(suggestionLimit);
      }
      if (suggestionThreshold != null) {
        dataAttributes["data-fuzzy-threshold"] = String(suggestionThreshold);
      }
      if (minSuggestionQueryLength != null) {
        dataAttributes["data-fuzzy-min"] = String(minSuggestionQueryLength);
      }
    } else {
      dataAttributes["data-fuzzy"] = "off";
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        {...dataAttributes}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
