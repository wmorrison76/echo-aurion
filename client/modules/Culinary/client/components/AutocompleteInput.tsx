import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useRecipeNameSuggestions,
  useInventoryItemSuggestions,
  useSupplierNameSuggestions,
  useComponentNameSuggestions,
  useAllergenSuggestions,
  useUnitSuggestions,
  useTechniqueSuggestions,
  useCuisineSuggestions,
  useCourseSuggestions,
} from "@/hooks/use-fuzzy-autocomplete";

type SuggestionType =
  | "recipes"
  | "ingredients"
  | "suppliers"
  | "components"
  | "allergens"
  | "units"
  | "techniques"
  | "cuisines"
  | "courses"
  | "custom";

export interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestionType?: SuggestionType;
  customSuggestions?: string[];
  maxSuggestions?: number;
  onSuggestionSelect?: (suggestion: string) => void;
  highlightMatches?: boolean;
  caseSensitive?: boolean;
}

const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  (
    {
      suggestionType = "ingredients",
      customSuggestions,
      maxSuggestions = 8,
      onSuggestionSelect,
      highlightMatches = true,
      caseSensitive = false,
      className,
      value,
      onChange,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState<string>(String(value || ""));
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Get suggestions based on type
    const recipeSuggestions = useRecipeNameSuggestions();
    const ingredientSuggestions = useInventoryItemSuggestions();
    const supplierSuggestions = useSupplierNameSuggestions();
    const componentSuggestions = useComponentNameSuggestions();
    const allergenSuggestions = useAllergenSuggestions();
    const unitSuggestions = useUnitSuggestions();
    const techniqueSuggestions = useTechniqueSuggestions();
    const cuisineSuggestions = useCuisineSuggestions();
    const courseSuggestions = useCourseSuggestions();

    const getSuggestions = (query: string): string[] => {
      const suggestionMap = {
        recipes: recipeSuggestions,
        ingredients: ingredientSuggestions,
        suppliers: supplierSuggestions,
        components: componentSuggestions,
        allergens: allergenSuggestions,
        units: unitSuggestions,
        techniques: techniqueSuggestions,
        cuisines: cuisineSuggestions,
        courses: courseSuggestions,
        custom: () => customSuggestions || [],
      };

      const suggester = suggestionMap[suggestionType];
      if (suggestionType === "custom") {
        return (suggester as () => string[])();
      }
      return (suggester as (q: string, o?: any) => string[])(query, {
        limit: maxSuggestions,
      });
    };

    // Update suggestions when input changes
    useEffect(() => {
      if (!inputValue.trim()) {
        setFilteredSuggestions([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        return;
      }

      const suggestions = getSuggestions(inputValue);
      setFilteredSuggestions(suggestions.slice(0, maxSuggestions));
      setIsOpen(suggestions.length > 0);
      setSelectedIndex(-1);
    }, [inputValue, suggestionType, customSuggestions, maxSuggestions]);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex >= 0 && listRef.current) {
        const items = listRef.current.querySelectorAll("li");
        items[selectedIndex]?.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex]);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        onKeyDown?.(e);
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            const selected = filteredSuggestions[selectedIndex];
            if (selected) {
              setInputValue(selected);
              setIsOpen(false);
              onSuggestionSelect?.(selected);
              // Update the actual input value
              const event = new Event("change", { bubbles: true });
              const target = e.currentTarget as HTMLInputElement;
              target.value = selected;
              target.dispatchEvent(event);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
        default:
          onKeyDown?.(e);
      }
    };

    const handleSuggestionClick = (suggestion: string) => {
      setInputValue(suggestion);
      setIsOpen(false);
      onSuggestionSelect?.(suggestion);
      // Update the actual input value
      const target = ref as React.RefObject<HTMLInputElement>;
      if (target?.current) {
        target.current.value = suggestion;
        target.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    const highlightMatch = (text: string) => {
      if (!highlightMatches || !inputValue.trim()) return text;

      const searchTerm = caseSensitive ? inputValue : inputValue.toLowerCase();
      const textToSearch = caseSensitive ? text : text.toLowerCase();
      const index = textToSearch.indexOf(searchTerm);

      if (index === -1) return text;

      return (
        <>
          {text.substring(0, index)}
          <mark className="bg-yellow-200/50 font-semibold">{text.substring(index, index + inputValue.length)}</mark>
          {text.substring(index + inputValue.length)}
        </>
      );
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && filteredSuggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          {...props}
        />

        {isOpen && filteredSuggestions.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-md border border-input bg-background shadow-md"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={`${suggestion}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors",
                  index === selectedIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {highlightMatch(suggestion)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

AutocompleteInput.displayName = "AutocompleteInput";

export { AutocompleteInput };
