import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DesignerElement } from "../hooks";

export type TypographyPreset = {
  id: string;
  name: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  color: string;
  createdAt: number;
};

const STORAGE_KEY = "menu-studio-typography-presets";

const DEFAULT_PRESETS: TypographyPreset[] = [
  {
    id: "h1",
    name: "Heading 1",
    fontSize: 48,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    fontFamily: "'Playfair Display', serif",
    color: "#1f2937",
    createdAt: Date.now(),
  },
  {
    id: "h2",
    name: "Heading 2",
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: 0,
    fontFamily: "'Playfair Display', serif",
    color: "#1f2937",
    createdAt: Date.now(),
  },
  {
    id: "h3",
    name: "Heading 3",
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: 0,
    fontFamily: "'Inter', sans-serif",
    color: "#1f2937",
    createdAt: Date.now(),
  },
  {
    id: "body",
    name: "Body",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: 0,
    fontFamily: "'Inter', sans-serif",
    color: "#374151",
    createdAt: Date.now(),
  },
  {
    id: "caption",
    name: "Caption",
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0.5,
    fontFamily: "'Inter', sans-serif",
    color: "#6b7280",
    createdAt: Date.now(),
  },
];

function getPresets(): TypographyPreset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load presets:", error);
  }
  return DEFAULT_PRESETS;
}

function savePresets(presets: TypographyPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("Failed to save presets:", error);
  }
}

interface TypographyPresetsProps {
  onApplyPreset: (updates: Partial<DesignerElement>) => void;
  currentElement?: DesignerElement;
}

export function TypographyPresets({
  onApplyPreset,
  currentElement,
}: TypographyPresetsProps) {
  const [presets, setPresets] = useState<TypographyPreset[]>(getPresets);
  const [newPresetName, setNewPresetName] = useState("");
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);

  const handleApplyPreset = (preset: TypographyPreset) => {
    onApplyPreset({
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      lineHeight: preset.lineHeight,
      letterSpacing: preset.letterSpacing,
      fontFamily: preset.fontFamily,
      color: preset.color,
    });
  };

  const handleSaveCurrentAsPreset = () => {
    if (!currentElement || !newPresetName.trim()) return;

    const newPreset: TypographyPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      fontSize: currentElement.fontSize || 16,
      fontWeight: currentElement.fontWeight || 400,
      lineHeight: currentElement.lineHeight || 1.6,
      letterSpacing: currentElement.letterSpacing || 0,
      fontFamily: currentElement.fontFamily || "'Inter', sans-serif",
      color: currentElement.color || "#000000",
      createdAt: Date.now(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    setNewPresetName("");
    setShowNewPresetForm(false);
  };

  const handleDeletePreset = (id: string) => {
    const updatedPresets = presets.filter((p) => p.id !== id);
    setPresets(updatedPresets);
    savePresets(updatedPresets);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <Label className="text-xs font-semibold">Typography Presets</Label>

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              {/* Preview */}
              <div
                className="mb-2 line-clamp-2 cursor-pointer hover:text-[#c8a97e] dark:hover:text-[#c8a97e]"
                style={{
                  fontSize: Math.min(preset.fontSize, 18),
                  fontWeight: preset.fontWeight,
                  lineHeight: preset.lineHeight,
                  letterSpacing: preset.letterSpacing,
                  fontFamily: preset.fontFamily,
                  color: preset.color,
                }}
                onClick={() => handleApplyPreset(preset)}
              >
                {preset.name}
              </div>

              {/* Details */}
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mb-2">
                <div className="flex justify-between">
                  <span>Font: {preset.fontFamily.split("'")[1]}</span>
                  <span>Size: {preset.fontSize}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight: {preset.fontWeight}</span>
                  <span>Line: {preset.lineHeight}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApplyPreset(preset)}
                  className="flex-1 h-7 text-xs bg-[#c8a97e] hover:bg-[#b8976c] dark:bg-[#b8976c] dark:hover:bg-[#c8a97e]-800"
                >
                  Apply
                </Button>
                {!DEFAULT_PRESETS.find((p) => p.id === preset.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="h-7 w-7 p-0 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Save Current as Preset */}
      {currentElement && ["heading", "subheading", "body", "menu-item"].includes(currentElement.type) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          {!showNewPresetForm ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewPresetForm(true)}
              className="w-full gap-2"
            >
              <Save className="h-3 w-3" />
              Save as Preset
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCurrentAsPreset();
                  } else if (e.key === "Escape") {
                    setShowNewPresetForm(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveCurrentAsPreset}
                  disabled={!newPresetName.trim()}
                  className="flex-1 h-7 text-xs"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewPresetForm(false)}
                  className="flex-1 h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
