import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StandardFiltersProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onReset?: () => void;
  placeholder?: string;
  rightSlot?: React.ReactNode;
  className?: string;
};

export function StandardFilters({
  searchValue,
  onSearchChange,
  onReset,
  placeholder = "Search records",
  rightSlot,
  className,
}: StandardFiltersProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-[240px] flex-1"
      />
      {rightSlot}
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
}
