import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type ColorSwatch = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

export type ColorPalette = {
  id: string;
  name: string;
  colors: ColorSwatch[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "menu-studio-color-palettes";
const DEFAULT_PALETTES: ColorPalette[] = [
  {
    id: "default",
    name: "Restaurant Default",
    colors: [
      { id: "primary", name: "Primary", color: "#1f2937", createdAt: Date.now() },
      { id: "accent", name: "Accent", color: "#c0763a", createdAt: Date.now() },
      { id: "success", name: "Success", color: "#10b981", createdAt: Date.now() },
      { id: "warning", name: "Warning", color: "#f59e0b", createdAt: Date.now() },
      { id: "error", name: "Error", color: "#ef4444", createdAt: Date.now() },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function getPalettes(): ColorPalette[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load palettes:", error);
  }
  return DEFAULT_PALETTES;
}

function savePalettes(palettes: ColorPalette[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  } catch (error) {
    console.error("Failed to save palettes:", error);
  }
}

interface ColorPaletteManagerProps {
  onColorSelect: (color: string) => void;
}

export function ColorPaletteManager({ onColorSelect }: ColorPaletteManagerProps) {
  const [palettes, setPalettes] = useState<ColorPalette[]>(getPalettes);
  const [activePaletteId, setActivePaletteId] = useState(palettes[0]?.id || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorValue, setNewColorValue] = useState("#ffffff");

  const activePalette = palettes.find((p) => p.id === activePaletteId);

  const handleAddColor = () => {
    if (!activePalette || !newColorName.trim()) return;

    const updatedPalettes = palettes.map((p) => {
      if (p.id === activePaletteId) {
        return {
          ...p,
          colors: [
            ...p.colors,
            {
              id: `color-${Date.now()}`,
              name: newColorName.trim(),
              color: newColorValue,
              createdAt: Date.now(),
            },
          ],
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    setPalettes(updatedPalettes);
    savePalettes(updatedPalettes);
    setNewColorName("");
    setNewColorValue("#ffffff");
  };

  const handleDeleteColor = (colorId: string) => {
    const updatedPalettes = palettes.map((p) => {
      if (p.id === activePaletteId) {
        return {
          ...p,
          colors: p.colors.filter((c) => c.id !== colorId),
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    setPalettes(updatedPalettes);
    savePalettes(updatedPalettes);
  };

  const handleCopyColor = (color: string, colorId: string) => {
    navigator.clipboard.writeText(color);
    setCopiedId(colorId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRenameColor = (colorId: string, newName: string) => {
    const updatedPalettes = palettes.map((p) => {
      if (p.id === activePaletteId) {
        return {
          ...p,
          colors: p.colors.map((c) =>
            c.id === colorId ? { ...c, name: newName } : c
          ),
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    setPalettes(updatedPalettes);
    savePalettes(updatedPalettes);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Palette Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Active Palette</Label>
        <div className="flex gap-1">
          {palettes.map((palette) => (
            <Button
              key={palette.id}
              variant={activePaletteId === palette.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActivePaletteId(palette.id)}
            >
              {palette.name}
            </Button>
          ))}
        </div>
      </div>

      {activePalette && (
        <>
          {/* Color List */}
          <ScrollArea className="flex-1 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="space-y-2 p-3">
              {activePalette.colors.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  No colors yet
                </p>
              ) : (
                activePalette.colors.map((swatch) => (
                  <div
                    key={swatch.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    {/* Color Preview */}
                    <div
                      className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer hover:ring-2 hover:ring-[#c8a97e] transition-all"
                      style={{ backgroundColor: swatch.color }}
                      onClick={() => onColorSelect(swatch.color)}
                      title="Click to apply color"
                    />

                    {/* Color Info */}
                    <div className="flex-1 min-w-0">
                      <Input
                        value={swatch.name}
                        onChange={(e) =>
                          handleRenameColor(swatch.id, e.target.value)
                        }
                        className="h-6 text-xs bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#c8a97e] focus:bg-white dark:focus:bg-gray-900 p-0"
                        placeholder="Color name"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {swatch.color}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopyColor(swatch.color, swatch.id)}
                      >
                        {copiedId === swatch.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:text-red-600 dark:hover:text-red-400"
                        onClick={() => handleDeleteColor(swatch.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Add New Color */}
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            <Label className="text-xs font-semibold">Add Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={newColorValue}
                onChange={(e) => setNewColorValue(e.target.value)}
                className="h-8 w-12 p-1 cursor-pointer"
              />
              <Input
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="Color name"
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddColor();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddColor}
                disabled={!newColorName.trim()}
                className="h-8 px-2"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Color Reference */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <Label className="text-xs font-semibold mb-2 block">Quick Reference</Label>
            <div className="grid grid-cols-5 gap-2">
              {activePalette.colors.map((swatch) => (
                <div
                  key={swatch.id}
                  className="group cursor-pointer"
                  onClick={() => onColorSelect(swatch.color)}
                  title={`${swatch.name}: ${swatch.color}`}
                >
                  <div
                    className="w-full aspect-square rounded-md border border-gray-300 dark:border-gray-600 hover:ring-2 hover:ring-[#c8a97e] transition-all"
                    style={{ backgroundColor: swatch.color }}
                  />
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1 truncate group-hover:text-[#c8a97e]">
                    {swatch.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
