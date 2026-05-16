import React from "react";

interface StandardFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StandardFilters({
  searchValue,
  onSearchChange,
  placeholder = "Search…",
  className = "",
  children,
}: StandardFiltersProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="text"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {children}
    </div>
  );
}
