import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PaperColor = {
  name: string;
  value: string;
  category: "white" | "cream" | "colored" | "specialty";
};

export const PAPER_COLORS: PaperColor[] = [
  // White & Neutrals
  { name: "Bright White", value: "#FFFFFF", category: "white" },
  { name: "Off White", value: "#F5F5F5", category: "white" },
  { name: "Natural White", value: "#FFFFF0", category: "white" },

  // Cream & Warm
  { name: "Cream", value: "#FFFDD0", category: "cream" },
  { name: "Vanilla", value: "#F3E5AB", category: "cream" },
  { name: "Ivory", value: "#FFFFF0", category: "cream" },
  { name: "Linen", value: "#FAF0E6", category: "cream" },

  // Light Colors
  { name: "Light Gray", value: "#F0F0F0", category: "colored" },
  { name: "Light Beige", value: "#F5F5DC", category: "colored" },
  { name: "Eggshell", value: "#FAFAF0", category: "colored" },
  { name: "Mint", value: "#F0FFF0", category: "colored" },

  // Specialty/Premium
  { name: "Champagne", value: "#F7E7CE", category: "specialty" },
  { name: "Pearl", value: "#EEE8EE", category: "specialty" },
  { name: "Soft Gold", value: "#FFF8DC", category: "specialty" },
];

interface PageColorSelectorProps {
  backgroundColor: string;
  onColorChange: (color: string) => void;
  className?: string;
}

export function PageColorSelector({
  backgroundColor,
  onColorChange,
  className,
}: PageColorSelectorProps) {
  const currentColor = PAPER_COLORS.find((c) => c.value === backgroundColor);

  const categorizedColors = {
    white: PAPER_COLORS.filter((c) => c.category === "white"),
    cream: PAPER_COLORS.filter((c) => c.category === "cream"),
    colored: PAPER_COLORS.filter((c) => c.category === "colored"),
    specialty: PAPER_COLORS.filter((c) => c.category === "specialty"),
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Color Preview */}
      <div
        className="w-8 h-8 rounded-md border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:ring-2 hover:ring-[#c8a97e] transition-all"
        style={{ backgroundColor }}
        title={currentColor?.name || "Custom color"}
      />

      {/* Color Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            title="Choose paper color"
          >
            <span className="hidden sm:inline">
              {currentColor?.name || "Custom"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* White & Neutrals */}
          <DropdownMenuLabel className="text-xs">
            White & Neutrals
          </DropdownMenuLabel>
          {categorizedColors.white.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-sm">{color.name}</span>
              {backgroundColor === color.value && (
                <span className="ml-auto text-xs text-[#c8a97e]">✓</span>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Cream & Warm */}
          <DropdownMenuLabel className="text-xs">Cream & Warm</DropdownMenuLabel>
          {categorizedColors.cream.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-sm">{color.name}</span>
              {backgroundColor === color.value && (
                <span className="ml-auto text-xs text-[#c8a97e]">✓</span>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Light Colors */}
          <DropdownMenuLabel className="text-xs">Light Colors</DropdownMenuLabel>
          {categorizedColors.colored.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-sm">{color.name}</span>
              {backgroundColor === color.value && (
                <span className="ml-auto text-xs text-[#c8a97e]">✓</span>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Specialty */}
          <DropdownMenuLabel className="text-xs">Specialty</DropdownMenuLabel>
          {categorizedColors.specialty.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-sm">{color.name}</span>
              {backgroundColor === color.value && (
                <span className="ml-auto text-xs text-[#c8a97e]">✓</span>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Custom Color */}
          <DropdownMenuLabel className="text-xs">Custom Color</DropdownMenuLabel>
          <div className="px-2 py-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
              title="Pick custom paper color"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
