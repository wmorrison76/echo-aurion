import React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/glass";

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  iconSize?: number;
}

export function DragHandle({ onMouseDown, className, iconSize = 14 }: DragHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        "cursor-grab active:cursor-grabbing select-none",
        "text-primary/80 hover:text-primary transition-colors",
        className
      )}
      title="Drag to move toolbar"
    >
      <GripVertical size={iconSize} />
    </div>
  );
}
