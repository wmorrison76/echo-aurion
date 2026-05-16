import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MeasurementUnit = "px" | "in" | "cm";

interface MeasurementUnitsToggleProps {
  unit: MeasurementUnit;
  onUnitChange: (unit: MeasurementUnit) => void;
}

const UNITS: { label: string; value: MeasurementUnit; description: string }[] = [
  { label: "Pixels", value: "px", description: "px" },
  { label: "Inches", value: "in", description: "in" },
  { label: "Centimeters", value: "cm", description: "cm" },
];

export function MeasurementUnitsToggle({ unit, onUnitChange }: MeasurementUnitsToggleProps) {
  const currentUnit = UNITS.find((u) => u.value === unit);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          {currentUnit?.description || "px"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {UNITS.map((u) => (
          <DropdownMenuItem
            key={u.value}
            onClick={() => onUnitChange(u.value)}
            className="flex items-center justify-between"
          >
            <span>{u.label}</span>
            {unit === u.value && <span className="ml-2">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper functions for unit conversion
export const PIXELS_PER_INCH = 96;

export function convertToUnit(pixels: number, unit: MeasurementUnit): number {
  switch (unit) {
    case "in":
      return pixels / PIXELS_PER_INCH;
    case "cm":
      return (pixels / PIXELS_PER_INCH) * 2.54;
    case "px":
    default:
      return pixels;
  }
}

export function convertFromUnit(value: number, unit: MeasurementUnit): number {
  switch (unit) {
    case "in":
      return value * PIXELS_PER_INCH;
    case "cm":
      return (value / 2.54) * PIXELS_PER_INCH;
    case "px":
    default:
      return value;
  }
}

export function formatMeasurement(pixels: number, unit: MeasurementUnit, precision: number = 2): string {
  const converted = convertToUnit(pixels, unit);
  return `${converted.toFixed(precision)}${unit}`;
}
