import React, { useState, useRef, useEffect } from 'react';
import { getAutocompleteSuggestions, isMisspelled } from '@/lib/culinary-fuzzy-match';
import { Check, AlertCircle } from 'lucide-react';

interface CulinaryAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  isDarkMode?: boolean;
  showSpellCheck?: boolean;
}

export const CulinaryAutocompleteInput = React.forwardRef<
  HTMLInputElement,
  CulinaryAutocompleteInputProps
>(
  (
    {
      value,
      onChange,
      onBlur,
      placeholder = 'Enter ingredient or technique...',
      className = '',
      isDarkMode = false,
      showSpellCheck = true,
    },
    ref
  ) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isMisspelledWord, setIsMisspelledWord] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update suggestions as user types
    useEffect(() => {
      if (value && value.trim().length > 0) {
        const newSuggestions = getAutocompleteSuggestions(value, 6);
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
        setSelectedIndex(-1);

        // Check for misspellings
        if (showSpellCheck && newSuggestions.length > 0) {
          setIsMisspelledWord(isMisspelled(value));
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsMisspelledWord(false);
      }
    }, [value, showSpellCheck]);

    // Handle keyboard navigation in suggestions
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    };

    const selectSuggestion = (suggestion: string) => {
      onChange(suggestion);
      setShowSuggestions(false);
      setSuggestions([]);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const baseClass = isDarkMode
      ? 'border-[#c8a97e]/25 bg-slate-900/70 text-white/80 placeholder-[#c8a97e]/40 focus:ring-[#c8a97e]/60 focus:ring-offset-slate-950'
      : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-sky-300/60 focus:ring-offset-white';

    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            ref={(el) => {
              if (typeof ref === 'function') ref(el);
              else if (ref) ref.current = el;
              inputRef.current = el;
            }}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${baseClass} ${className} ${
              isMisspelledWord && value.trim().length > 0
                ? isDarkMode
                  ? 'border-orange-400/50'
                  : 'border-orange-300'
                : ''
            }`}
          />
          
          {isMisspelledWord && value.trim().length > 0 && showSpellCheck && (
            <AlertCircle className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
              isDarkMode ? 'text-orange-400' : 'text-orange-500'
            }`} />
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border shadow-lg max-h-56 overflow-y-auto ${
              isDarkMode
                ? 'border-[#c8a97e]/25 bg-slate-900/95 shadow-[#c8a97e]-500/20'
                : 'border-slate-200 bg-white/95 shadow-slate-300/40'
            }`}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                  index === selectedIndex
                    ? isDarkMode
                      ? 'bg-[#c8a97e]/25 text-white/80'
                      : 'bg-blue-100 text-blue-900'
                    : isDarkMode
                    ? 'text-[#c8a97e]/80 hover:bg-[#c8a97e]/12'
                    : 'text-slate-700 hover:bg-slate-100'
                } ${index > 0 ? 'border-t' : ''} ${
                  isDarkMode ? 'border-[#c8a97e]/10' : 'border-slate-200/50'
                }`}
              >
                <span>{suggestion}</span>
                {index === selectedIndex && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        )}

        {isMisspelledWord && value.trim().length > 0 && showSpellCheck && (
          <p className={`mt-1 text-xs flex items-center gap-1 ${
            isDarkMode ? 'text-orange-400' : 'text-orange-600'
          }`}>
            <AlertCircle className="h-3 w-3" />
            Possible misspelling - check suggestions above
          </p>
        )}
      </div>
    );
  }
);

CulinaryAutocompleteInput.displayName = 'CulinaryAutocompleteInput';
