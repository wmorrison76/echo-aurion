import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { CanvasSettings, PageSize } from "../hooks";

interface DocumentSettingsDialogProps {
  pageSize: PageSize;
  canvasSettings: CanvasSettings;
  onPageSizeChange: (size: PageSize) => void;
  onCanvasSettingsChange: (settings: Partial<CanvasSettings>) => void;
  children?: React.ReactNode;
}

export function DocumentSettingsDialog({
  pageSize,
  canvasSettings,
  onPageSizeChange,
  onCanvasSettingsChange,
  children,
}: DocumentSettingsDialogProps) {
  const [width, setWidth] = useState(pageSize.width);
  const [height, setHeight] = useState(pageSize.height);
  const [margin, setMargin] = useState(canvasSettings.margin);
  const [bleed, setBleed] = useState(canvasSettings.bleed);
  const [background, setBackground] = useState(canvasSettings.background);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onPageSizeChange({
      width: Math.round(width),
      height: Math.round(height),
    });
    onCanvasSettingsChange({
      margin: Math.round(margin),
      bleed: Math.round(bleed),
      background,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setWidth(pageSize.width);
    setHeight(pageSize.height);
    setMargin(canvasSettings.margin);
    setBleed(canvasSettings.bleed);
    setBackground(canvasSettings.background);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline" size="sm">Document Settings</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document Settings</DialogTitle>
          <DialogDescription>
            Configure your document's page size, margins, and other properties.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="page" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="page">Page</TabsTrigger>
            <TabsTrigger value="margins">Margins & Bleed</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          {/* Page Tab */}
          <TabsContent value="page" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="page-width" className="text-sm font-medium">
                    Page Width (pixels)
                  </Label>
                  <Input
                    id="page-width"
                    type="number"
                    value={Math.round(width)}
                    onChange={(e) => setWidth(parseFloat(e.target.value))}
                    className="mt-1.5"
                    min="100"
                    max="4000"
                  />
                </div>
                <div>
                  <Label htmlFor="page-height" className="text-sm font-medium">
                    Page Height (pixels)
                  </Label>
                  <Input
                    id="page-height"
                    type="number"
                    value={Math.round(height)}
                    onChange={(e) => setHeight(parseFloat(e.target.value))}
                    className="mt-1.5"
                    min="100"
                    max="4000"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Aspect Ratio: <strong>{(width / height).toFixed(2)} : 1</strong>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Current: {Math.round(width)} × {Math.round(height)} px
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Margins & Bleed Tab */}
          <TabsContent value="margins" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="margin" className="text-sm font-medium">
                    Margin (pixels)
                  </Label>
                  <Input
                    id="margin"
                    type="number"
                    value={Math.round(margin)}
                    onChange={(e) => setMargin(parseFloat(e.target.value))}
                    className="mt-1.5"
                    min="0"
                    max="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Space inside the page boundaries</p>
                </div>
                <div>
                  <Label htmlFor="bleed" className="text-sm font-medium">
                    Bleed (pixels)
                  </Label>
                  <Input
                    id="bleed"
                    type="number"
                    value={Math.round(bleed)}
                    onChange={(e) => setBleed(parseFloat(e.target.value))}
                    className="mt-1.5"
                    min="0"
                    max="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">For print production (extends beyond page)</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> Margin defines the safe area for content. Bleed extends the background/color beyond the page edge for printing.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="background-color" className="text-sm font-medium">
                  Background Color
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    id="background-color"
                    type="color"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Preview
                </p>
                <div
                  className="border-4 border-gray-300 rounded h-32 w-full"
                  style={{ backgroundColor: background }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="mr-auto"
          >
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-[#c8a97e] hover:bg-[#b8976c]"
          >
            Apply Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
