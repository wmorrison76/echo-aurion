import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Sparkles,
  Zap,
  Layout,
  Palette,
  Type,
  RefreshCw,
  Copy,
  Download,
  Settings,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { DesignerElement } from "../hooks";
import {
  VectorFontEngine,
  type FontVariation,
  type FontOutlineProperties,
  type CanvasFontState,
  type FontPreset,
  type FontLibrary,
  type VectorFont,
  type FontExportOptions,
  type BleedMarks,
  type ColorMarks,
} from "@/echo/vectorFonts";
import { useDesignerDishAssemblySync } from "@/hooks/useDesignerDishAssemblySync";
import { DishAssemblyBridge, type DishData } from "./DishAssemblyBridge";

// --- Font Toolbar Component ---
interface FontToolbarProps {
  fontState: CanvasFontState | null;
  onFontChange: (fontId: string) => void;
  onVariationChange: (variations: FontVariation) => void;
  onOutlineChange: (outline: FontOutlineProperties) => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onLetterSpacingChange: (spacing: number) => void;
  onExportFont: (options: FontExportOptions) => void;
  onSavePreset: (preset: FontPreset) => void;
}

export const FontToolbar: React.FC<FontToolbarProps> = ({
  fontState,
  onFontChange,
  onVariationChange,
  onOutlineChange,
  onFontSizeChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onExportFont,
  onSavePreset,
}) => {
  const { library } = useMemo(() => ({ library: VectorFontEngine.library() }), []);
  const [presetName, setPresetName] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const currentFont = useMemo(() => {
    if (!fontState) return null;
    return library.fonts.find((f) => f.id === fontState.fontId);
  }, [fontState, library]);

  const handleFontSelect = useCallback(
    (fontId: string) => {
      onFontChange(fontId);
    },
    [onFontChange]
  );

  const handleSavePreset = useCallback(() => {
    if (!fontState || !presetName.trim()) {
      toast({ title: "Error", description: "Please select a font and enter a name." });
      return;
    }
    const preset: FontPreset = {
      id: `preset-${Date.now()}`,
      name: presetName,
      description: `Custom preset: ${presetName}`,
      variations: fontState.variations,
      outline: fontState.outline,
      baseFont: fontState.fontFamily,
      tags: [presetName.toLowerCase(), "custom"],
    };
    onSavePreset(preset);
    setPresetName("");
    toast({ title: "Preset Saved", description: `"${presetName}" saved successfully.` });
  }, [fontState, presetName, onSavePreset]);

  const handleExport = useCallback(() => {
    if (!fontState) return;
    const options: FontExportOptions = {
      format: "woff2", // Default format
      includeVariations: true,
      includeMetadata: true,
      compression: "gzip",
    };
    onExportFont(options);
    toast({ title: "Export Initiated", description: "Font export process started." });
  }, [fontState, onExportFont]);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-primary/20 bg-background/90 backdrop-blur">
      {/* Font Family Selector */}
      <Select onValueChange={handleFontSelect} value={currentFont?.id || ""}>
        <SelectTrigger className="w-48 text-sm h-9">
          <SelectValue placeholder="Select Font Family" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {library.fonts.map((font) => (
            <SelectItem key={font.id} value={font.id} className="text-sm">
              {font.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quick Controls (if font is selected) */}
      {currentFont && (
        <>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Size:</Label>
            <Input
              type="number"
              value={fontState?.fontSize || 16}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="w-16 h-9 text-sm"
              min={8}
              max={96}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Weight:</Label>
            <Select
              onValueChange={(val) =>
                onVariationChange({ ...fontState?.variations, weight: Number(val) })
              }
              value={String(fontState?.variations.weight || 400)}
            >
              <SelectTrigger className="w-24 text-sm h-9">
                <SelectValue placeholder="Weight" />
              </SelectTrigger>
              <SelectContent>
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <SelectItem key={w} value={String(w)} className="text-sm">
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Dialog */}
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={() => setExportDialogOpen(true)}
              >
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-primary/40">
              <DialogHeader>
                <DialogTitle>Export Font Settings</DialogTitle>
                <DialogDescription>
                  Choose export format and options for your current font settings.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="export-format" className="text-right text-xs">
                    Format
                  </Label>
                  <Select defaultValue="woff2">
                    <SelectTrigger className="col-span-2 text-sm h-9">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="woff2">WOFF2</SelectItem>
                      <SelectItem value="woff">WOFF</SelectItem>
                      <SelectItem value="ttf">TTF</SelectItem>
                      <SelectItem value="otf">OTF</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Add more export options here if needed */}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setExportDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleExport();
                    setExportDialogOpen(false);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Export
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save Preset */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Preset Name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-32 text-sm h-9"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSavePreset}
              disabled={!presetName.trim() || !fontState}
              className="h-9 px-3 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Save Preset
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default FontToolbar;
