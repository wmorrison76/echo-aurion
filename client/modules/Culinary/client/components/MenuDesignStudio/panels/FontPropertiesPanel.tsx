import React, { useState, useCallback, useMemo } from "react";
import { Sparkles, Copy, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  VectorFontEngine,
  FontAnalysisEngine,
  type FontVariation,
  type FontOutlineProperties,
  type CanvasFontState,
} from "@/echo/vectorFonts";

interface FontPropertiesPanelProps {
  elementId: string;
  fontState: CanvasFontState;
  onVariationChange: (variations: FontVariation) => void;
  onOutlineChange: (outline: FontOutlineProperties) => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onLetterSpacingChange: (spacing: number) => void;
  onPreview: (css: string) => void;
}

export const FontPropertiesPanel: React.FC<FontPropertiesPanelProps> = ({
  elementId,
  fontState,
  onVariationChange,
  onOutlineChange,
  onFontSizeChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onPreview,
}) => {
  const [variations, setVariations] = useState<FontVariation>(fontState.variations);
  const [outline, setOutline] = useState<FontOutlineProperties>(fontState.outline);
  const [fontSize, setFontSize] = useState(fontState.fontSize);
  const [lineHeight, setLineHeight] = useState(fontState.lineHeight);
  const [letterSpacing, setLetterSpacing] = useState(fontState.letterSpacing);

  // Analysis
  const analysis = useMemo(() => {
    return FontAnalysisEngine.analyzeFontState(fontState);
  }, [fontState]);

  // Generate CSS for preview
  const generatedCSS = useMemo(() => {
    return VectorFontEngine.generateCompleteFontCSS(fontState);
  }, [fontState]);

  const handleWeightChange = useCallback(
    (weight: number[]) => {
      const updated = { ...variations, weight: weight[0] };
      setVariations(updated);
      onVariationChange(updated);
    },
    [variations, onVariationChange]
  );

  const handleWidthChange = useCallback(
    (width: number[]) => {
      const updated = { ...variations, width: width[0] };
      setVariations(updated);
      onVariationChange(updated);
    },
    [variations, onVariationChange]
  );

  const handleItalicChange = useCallback(
    (italic: number[]) => {
      const updated = { ...variations, italic: italic[0] };
      setVariations(updated);
      onVariationChange(updated);
    },
    [variations, onVariationChange]
  );

  const handleSlantChange = useCallback(
    (slant: number[]) => {
      const updated = { ...variations, slant: slant[0] };
      setVariations(updated);
      onVariationChange(updated);
    },
    [variations, onVariationChange]
  );

  const handleOpticalSizeChange = useCallback(
    (size: number[]) => {
      const updated = { ...variations, opticalSize: size[0] };
      setVariations(updated);
      onVariationChange(updated);
    },
    [variations, onVariationChange]
  );

  const handleStrokeWidthChange = useCallback(
    (width: number[]) => {
      const updated = { ...outline, strokeWidth: width[0] };
      setOutline(updated);
      onOutlineChange(updated);
    },
    [outline, onOutlineChange]
  );

  const handleShadowBlurChange = useCallback(
    (blur: number[]) => {
      const updated = { ...outline, shadowBlur: blur[0] };
      setOutline(updated);
      onOutlineChange(updated);
    },
    [outline, onOutlineChange]
  );

  const handleStrokeColorChange = useCallback(
    (color: string) => {
      const updated = { ...outline, strokeColor: color };
      setOutline(updated);
      onOutlineChange(updated);
    },
    [outline, onOutlineChange]
  );

  const handleFillColorChange = useCallback(
    (color: string) => {
      const updated = { ...outline, fillColor: color };
      setOutline(updated);
      onOutlineChange(updated);
    },
    [outline, onOutlineChange]
  );

  const handleFontSizeChange = useCallback(
    (size: number[]) => {
      setFontSize(size[0]);
      onFontSizeChange(size[0]);
    },
    [onFontSizeChange]
  );

  const handleLineHeightChange = useCallback(
    (height: number[]) => {
      setLineHeight(height[0]);
      onLineHeightChange(height[0]);
    },
    [onLineHeightChange]
  );

  const handleLetterSpacingChange = useCallback(
    (spacing: number[]) => {
      setLetterSpacing(spacing[0]);
      onLetterSpacingChange(spacing[0]);
    },
    [onLetterSpacingChange]
  );

  const handleCopyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS);
    toast({
      title: "CSS Copied",
      description: "Font CSS copied to clipboard",
    });
  }, [generatedCSS]);

  const handleReset = useCallback(() => {
    const defaultVariations: FontVariation = {};
    const defaultOutline: FontOutlineProperties = { strokeWidth: 0, fillColor: "#000" };

    setVariations(defaultVariations);
    setOutline(defaultOutline);
    setFontSize(16);
    setLineHeight(1.5);
    setLetterSpacing(0);

    onVariationChange(defaultVariations);
    onOutlineChange(defaultOutline);
    onFontSizeChange(16);
    onLineHeightChange(1.5);
    onLetterSpacingChange(0);

    toast({
      title: "Reset",
      description: "Font properties reset to defaults",
    });
  }, [onVariationChange, onOutlineChange, onFontSizeChange, onLineHeightChange, onLetterSpacingChange]);

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-6 p-4 pb-8">
        {/* Analysis Score */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Font Quality Analysis</h3>
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {Math.round(analysis.readability)}% Readable
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Readability:</span>
                <span className="font-semibold">{analysis.readability}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accessibility:</span>
                <span className="font-semibold">{analysis.accessibility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand Alignment:</span>
                <span className="font-semibold">{analysis.brandAlignment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hierarchy:</span>
                <span className="font-semibold">{analysis.hierarchy}</span>
              </div>
            </div>

            {analysis.suggestions.length > 0 && (
              <div className="mt-4 space-y-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                {analysis.suggestions.map((suggestion) => (
                  <p key={`suggestion-${suggestion.replace(/\s+/g, '-')}`}>→ {suggestion}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="bg-primary/20" />

        {/* Tabs */}
        <Tabs defaultValue="variations" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background/80 border border-primary/30">
            <TabsTrigger value="variations" className="text-xs">
              Variations
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">
              Effects
            </TabsTrigger>
            <TabsTrigger value="sizing" className="text-xs">
              Sizing
            </TabsTrigger>
          </TabsList>

          {/* Variations Tab */}
          <TabsContent value="variations" className="space-y-4 mt-4">
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Variable Font Axes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Weight */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Weight</Label>
                    <Badge variant="outline" className="text-xs">
                      {variations.weight || 400}
                    </Badge>
                  </div>
                  <Slider
                    min={100}
                    max={900}
                    step={100}
                    value={[variations.weight || 400]}
                    onValueChange={handleWeightChange}
                    className="cursor-pointer"
                  />
                  <div className="flex gap-1 text-[10px] text-muted-foreground">
                    <span>Light</span>
                    <span className="flex-1"></span>
                    <span>Bold</span>
                  </div>
                </div>

                {/* Width */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Width</Label>
                    <Badge variant="outline" className="text-xs">
                      {variations.width || 100}%
                    </Badge>
                  </div>
                  <Slider
                    min={75}
                    max={125}
                    step={1}
                    value={[variations.width || 100]}
                    onValueChange={handleWidthChange}
                    className="cursor-pointer"
                  />
                  <div className="flex gap-1 text-[10px] text-muted-foreground">
                    <span>Condensed</span>
                    <span className="flex-1"></span>
                    <span>Expanded</span>
                  </div>
                </div>

                {/* Italic */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Italic</Label>
                    <Badge variant="outline" className="text-xs">
                      {(variations.italic || 0).toFixed(1)}
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[variations.italic || 0]}
                    onValueChange={handleItalicChange}
                    className="cursor-pointer"
                  />
                </div>

                {/* Slant */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Slant</Label>
                    <Badge variant="outline" className="text-xs">
                      {variations.slant || 0}°
                    </Badge>
                  </div>
                  <Slider
                    min={-90}
                    max={90}
                    step={5}
                    value={[variations.slant || 0]}
                    onValueChange={handleSlantChange}
                    className="cursor-pointer"
                  />
                </div>

                {/* Optical Size */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Optical Size</Label>
                    <Badge variant="outline" className="text-xs">
                      {variations.opticalSize || 16}pt
                    </Badge>
                  </div>
                  <Slider
                    min={6}
                    max={72}
                    step={1}
                    value={[variations.opticalSize || 16]}
                    onValueChange={handleOpticalSizeChange}
                    className="cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="space-y-4 mt-4">
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Text Effects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fill Color */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Fill Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={outline.fillColor || "#000000"}
                      onChange={(e) => handleFillColorChange(e.target.value)}
                      className="h-10 w-14 rounded border border-primary/30 cursor-pointer"
                    />
                    <Input
                      value={outline.fillColor || "#000000"}
                      onChange={(e) => handleFillColorChange(e.target.value)}
                      className="flex-1 text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Stroke Width */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Stroke Width</Label>
                    <Badge variant="outline" className="text-xs">
                      {(outline.strokeWidth || 0).toFixed(1)}px
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={5}
                    step={0.5}
                    value={[outline.strokeWidth || 0]}
                    onValueChange={handleStrokeWidthChange}
                    className="cursor-pointer"
                  />
                </div>

                {/* Stroke Color */}
                {(outline.strokeWidth || 0) > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Stroke Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={outline.strokeColor || "#000000"}
                        onChange={(e) => handleStrokeColorChange(e.target.value)}
                        className="h-10 w-14 rounded border border-primary/30 cursor-pointer"
                      />
                      <Input
                        value={outline.strokeColor || "#000000"}
                        onChange={(e) => handleStrokeColorChange(e.target.value)}
                        className="flex-1 text-xs"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                )}

                {/* Shadow Blur */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Shadow Blur</Label>
                    <Badge variant="outline" className="text-xs">
                      {(outline.shadowBlur || 0).toFixed(0)}px
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[outline.shadowBlur || 0]}
                    onValueChange={handleShadowBlurChange}
                    className="cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sizing Tab */}
          <TabsContent value="sizing" className="space-y-4 mt-4">
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Size & Spacing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Font Size</Label>
                    <Badge variant="outline" className="text-xs">
                      {fontSize}px
                    </Badge>
                  </div>
                  <Slider
                    min={8}
                    max={96}
                    step={1}
                    value={[fontSize]}
                    onValueChange={handleFontSizeChange}
                    className="cursor-pointer"
                  />
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Line Height</Label>
                    <Badge variant="outline" className="text-xs">
                      {lineHeight.toFixed(2)}
                    </Badge>
                  </div>
                  <Slider
                    min={1}
                    max={3}
                    step={0.1}
                    value={[lineHeight]}
                    onValueChange={handleLineHeightChange}
                    className="cursor-pointer"
                  />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Letter Spacing</Label>
                    <Badge variant="outline" className="text-xs">
                      {letterSpacing.toFixed(2)}px
                    </Badge>
                  </div>
                  <Slider
                    min={-2}
                    max={5}
                    step={0.1}
                    value={[letterSpacing]}
                    onValueChange={handleLetterSpacingChange}
                    className="cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CSS Output */}
        <Card className="border-primary/30 bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Generated CSS</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCSS}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] bg-background rounded p-2 overflow-x-auto max-h-32">
              <code>{generatedCSS}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="flex-1 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Save Preset
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default FontPropertiesPanel;
