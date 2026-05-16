import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeasurementUnitsToggle, type MeasurementUnit } from "./MeasurementUnitsToggle";

interface StatusBarProps {
  zoom: number;
  selectedElementCount: number;
  totalElementCount: number;
  measurementUnit?: MeasurementUnit;
  onMeasurementUnitChange?: (unit: MeasurementUnit) => void;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export function StatusBar({
  zoom,
  selectedElementCount,
  totalElementCount,
  measurementUnit = "px",
  onMeasurementUnitChange,
  onZoomChange,
  className,
}: StatusBarProps) {
  return (
    <div
      className={cn(
        "flex h-10 items-center justify-between border-t border-gray-200 bg-white px-6 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400",
        className
      )}
    >
      {/* Left - Element Info */}
      <div className="flex items-center gap-6">
        <div>
          {selectedElementCount > 0 && (
            <span>
              {selectedElementCount} of {totalElementCount} selected
            </span>
          )}
          {selectedElementCount === 0 && <span>{totalElementCount} elements</span>}
        </div>
      </div>

      {/* Right - Controls */}
      <div className="flex items-center gap-2">
        {/* Measurement Unit Toggle */}
        <MeasurementUnitsToggle
          unit={measurementUnit}
          onUnitChange={onMeasurementUnitChange || (() => {})}
        />

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Zoom Controls */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onZoomChange?.(Math.max(0.1, zoom - 0.1))}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="w-12 text-center text-xs font-medium">
          {Math.round(zoom * 100)}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onZoomChange?.(Math.min(3, zoom + 0.1))}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        <span className="text-xs text-gray-500 dark:text-gray-500">
          Preview Mode
        </span>
      </div>
    </div>
  );
}
