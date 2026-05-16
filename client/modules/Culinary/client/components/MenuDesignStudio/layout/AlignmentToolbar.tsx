import { useState } from "react";
import { ChevronDown, AlignLeft, AlignCenter, AlignRight, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DesignerElement } from "../hooks";

interface AlignmentToolbarProps {
  selectedElements: DesignerElement[];
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  onDistributeHorizontally: () => void;
  onDistributeVertically: () => void;
  onMatchWidth: () => void;
  onMatchHeight: () => void;
  className?: string;
}

export function AlignmentToolbar({
  selectedElements,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontally,
  onDistributeVertically,
  onMatchWidth,
  onMatchHeight,
  className,
}: AlignmentToolbarProps) {
  const isMultiSelect = selectedElements.length > 1;

  if (!isMultiSelect) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-md",
        className
      )}
    >
      {/* Horizontal Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAlignLeft}
          title="Align Left (Alt+L)"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAlignCenter}
          title="Align Center (Alt+C)"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAlignRight}
          title="Align Right (Alt+R)"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Vertical Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAlignTop}
          title="Align Top (Alt+T)"
        >
          <div className="h-4 w-4 border-t-2 border-current" style={{ opacity: 0.6 }} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAlignMiddle}
          title="Align Middle (Alt+M)"
        >
          <div className="h-4 w-4 border border-current" style={{ opacity: 0.6 }} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAlignBottom}
          title="Align Bottom (Alt+B)"
        >
          <div className="h-4 w-4 border-b-2 border-current" style={{ opacity: 0.6 }} />
        </Button>
      </div>

      {/* Distribute & Sizing */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1"
            title="Distribution and Sizing Options"
          >
            <Grid2X2 className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Distribute</DropdownMenuLabel>
          <DropdownMenuItem onClick={onDistributeHorizontally}>
            <span>Distribute Horizontally (Alt+Shift+H)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDistributeVertically}>
            <span>Distribute Vertically (Alt+Shift+V)</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Match Size</DropdownMenuLabel>
          <DropdownMenuItem onClick={onMatchWidth}>
            <span>Match Width</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMatchHeight}>
            <span>Match Height</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
