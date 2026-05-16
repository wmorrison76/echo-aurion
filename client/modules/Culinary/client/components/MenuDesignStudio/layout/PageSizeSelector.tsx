import { useState } from "react";
import { ChevronDown, RotateCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PageSize } from "../hooks";

export type PagePreset = {
  name: string;
  width: number;
  height: number;
  category: string;
};

export const PAGE_PRESETS: PagePreset[] = [
  // Standard Print
  { name: "Letter", width: 816, height: 1056, category: "Standard Print" },
  { name: "Legal", width: 816, height: 1344, category: "Standard Print" },
  { name: "Tabloid", width: 1056, height: 1632, category: "Standard Print" },

  // Metric
  { name: "A4", width: 793, height: 1123, category: "Metric" },
  { name: "A3", width: 1123, height: 1587, category: "Metric" },
  { name: "A5", width: 560, height: 793, category: "Metric" },

  // Menu-Specific
  {
    name: "Table Tent (3.5×5.5\" Folded)",
    width: 504,
    height: 360,
    category: "Menu",
  },
  {
    name: "Table Tent (3.5×5.5\" Unfolded)",
    width: 1008,
    height: 360,
    category: "Menu",
  },
  { name: "Postcard (4×6\")", width: 576, height: 864, category: "Menu" },

  // Social Media
  {
    name: "Instagram Square (1080×1080px)",
    width: 1080,
    height: 1080,
    category: "Social Media",
  },
  {
    name: "Instagram Portrait (1080×1350px)",
    width: 1080,
    height: 1350,
    category: "Social Media",
  },
];

interface PageSizeSelectorProps {
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  className,
}: PageSizeSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState(pageSize.width);
  const [customHeight, setCustomHeight] = useState(pageSize.height);
  const [isPortrait, setIsPortrait] = useState(pageSize.height > pageSize.width);

  // Find matching preset
  const currentPreset = PAGE_PRESETS.find(
    (p) => p.width === pageSize.width && p.height === pageSize.height
  );

  const handlePresetSelect = (presetName: string) => {
    const preset = PAGE_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      onPageSizeChange({ width: preset.width, height: preset.height });
      setIsCustom(false);
      setCustomWidth(preset.width);
      setCustomHeight(preset.height);
    }
  };

  const handleCustomSizeApply = () => {
    onPageSizeChange({
      width: Math.round(customWidth),
      height: Math.round(customHeight),
    });
    setIsCustom(true);
  };

  const handleRotate = () => {
    const newSize = {
      width: pageSize.height,
      height: pageSize.width,
    };
    onPageSizeChange(newSize);
    setCustomWidth(newSize.width);
    setCustomHeight(newSize.height);
    setIsPortrait(!isPortrait);
  };

  const displayLabel = currentPreset
    ? currentPreset.name
    : `${Math.round(pageSize.width)} × ${Math.round(pageSize.height)}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Preset Selector */}
      <Select value={currentPreset?.name || ""} onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-64 h-9 text-sm">
          <SelectValue placeholder="Choose page size" />
        </SelectTrigger>
        <SelectContent>
          {["Standard Print", "Metric", "Menu", "Social Media"].map(
            (category) => {
              const categoryPresets = PAGE_PRESETS.filter(
                (p) => p.category === category
              );
              return (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {category}
                  </div>
                  {categoryPresets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                      <span className="ml-2 text-xs text-gray-500">
                        ({preset.width}×{preset.height})
                      </span>
                    </SelectItem>
                  ))}
                </div>
              );
            }
          )}
        </SelectContent>
      </Select>

      {/* Rotate Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRotate}
        title="Rotate page orientation"
        className="h-9 w-9 p-0"
      >
        <RotateCw className="h-4 w-4" />
      </Button>

      {/* Custom Size Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            title="Set custom page size"
          >
            Custom
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Page Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Width (pixels)</Label>
                <Input
                  type="number"
                  value={Math.round(customWidth)}
                  onChange={(e) => setCustomWidth(parseFloat(e.target.value))}
                  className="mt-1 h-9"
                  min="100"
                  max="2000"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Height (pixels)</Label>
                <Input
                  type="number"
                  value={Math.round(customHeight)}
                  onChange={(e) => setCustomHeight(parseFloat(e.target.value))}
                  className="mt-1 h-9"
                  min="100"
                  max="2000"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Aspect Ratio:{" "}
                <strong>
                  {(customWidth / customHeight).toFixed(2)} : 1
                </strong>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Preview: {Math.round(customWidth)} × {Math.round(customHeight)} px
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleCustomSizeApply}
                  className="bg-[#c8a97e] hover:bg-[#b8976c]"
                >
                  Apply
                </Button>
              </DialogTrigger>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Current Size Display */}
      <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {Math.round(pageSize.width)} × {Math.round(pageSize.height)}
      </div>
    </div>
  );
}
