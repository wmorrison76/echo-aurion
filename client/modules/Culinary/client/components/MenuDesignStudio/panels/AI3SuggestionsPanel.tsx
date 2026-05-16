import React, { useState, useCallback, useMemo } from "react";
import { Sparkles, Zap, Layout, Palette, Type, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { DesignerElement } from "../hooks";

interface AI3Suggestion {
  id: string;
  type: "layout" | "typography" | "color" | "content" | "composition";
  title: string;
  description: string;
  confidence: number;
  action: {
    label: string;
    callback: () => void;
  };
  details?: Record<string, any>;
}

interface AI3SuggestionsPanelProps {
  elements: DesignerElement[];
  selectedElementId: string | null;
  onApplySuggestion: (suggestion: AI3Suggestion) => void;
  onGenerateLayouts: (style: string) => void;
  onEnhanceContent: (elementId: string) => void;
}

const generateColorPalettes = () => [
  {
    id: "warm-elegant",
    name: "Warm Elegant",
    colors: ["#8B4513", "#D2691E", "#F4A460", "#DEB887", "#F5DEB3"],
    occasion: "Fine Dining",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    colors: ["#1F2937", "#374151", "#9CA3AF", "#E5E7EB", "#F9FAFB"],
    occasion: "Contemporary",
  },
  {
    id: "vibrant-modern",
    name: "Vibrant Modern",
    colors: ["#DC2626", "#EA580C", "#EAAC39", "#40A578", "#3498DB"],
    occasion: "Casual Dining",
  },
  {
    id: "luxury-dark",
    name: "Luxury Dark",
    colors: ["#1a1a1a", "#2d2d2d", "#FFD700", "#C0C0C0", "#FFFFFF"],
    occasion: "Premium",
  },
  {
    id: "pastel-soft",
    name: "Pastel Soft",
    colors: ["#FFB3BA", "#FFCCCB", "#FFFFBA", "#BAE1FF", "#FFB3D9"],
    occasion: "Bistro",
  },
];

const generateLayoutSuggestions = (elementCount: number): AI3Suggestion[] => [
  {
    id: "grid-layout-2x2",
    type: "layout",
    title: "2x2 Grid Layout",
    description: "Professional balanced grid arrangement perfect for menu sections",
    confidence: 0.92,
    action: {
      label: "Apply Grid",
      callback: () => {},
    },
    details: {
      columns: 2,
      rows: 2,
      spacing: 32,
      type: "grid",
    },
  },
  {
    id: "horizontal-flow",
    type: "layout",
    title: "Horizontal Flow",
    description: "Left-to-right reading pattern with visual hierarchy",
    confidence: 0.88,
    action: {
      label: "Apply Layout",
      callback: () => {},
    },
    details: {
      direction: "horizontal",
      alignment: "left",
      spacing: 24,
    },
  },
  {
    id: "centered-featured",
    type: "layout",
    title: "Centered Feature",
    description: "Hero element centered with supporting items around it",
    confidence: 0.85,
    action: {
      label: "Apply Layout",
      callback: () => {},
    },
    details: {
      layout: "centered-feature",
      hierarchy: "clear",
    },
  },
];

const generateTypographySuggestions = (elements: DesignerElement[]): AI3Suggestion[] => [
  {
    id: "type-hierarchy-classic",
    type: "typography",
    title: "Classic Hierarchy",
    description: "Traditional serif heading + sans-serif body pairing",
    confidence: 0.87,
    action: {
      label: "Apply Typography",
      callback: () => {},
    },
    details: {
      heading: "Georgia, serif",
      body: "Inter, sans-serif",
      scale: 1.618,
    },
  },
  {
    id: "type-modern-clean",
    type: "typography",
    title: "Modern Clean",
    description: "Contemporary sans-serif throughout with clear size differentiation",
    confidence: 0.84,
    action: {
      label: "Apply Typography",
      callback: () => {},
    },
    details: {
      heading: "Helvetica Neue, sans-serif",
      body: "Helvetica Neue, sans-serif",
      scale: 1.5,
    },
  },
  {
    id: "type-premium-mix",
    type: "typography",
    title: "Premium Mix",
    description: "High-contrast elegant serif for headings, clean sans for details",
    confidence: 0.81,
    action: {
      label: "Apply Typography",
      callback: () => {},
    },
    details: {
      heading: "Bodoni, serif",
      body: "Gotham, sans-serif",
      scale: 1.75,
    },
  },
];

const generateContentSuggestions = (elements: DesignerElement[]): AI3Suggestion[] => [
  {
    id: "content-enhance-descriptions",
    type: "content",
    title: "Enhance Item Descriptions",
    description: "Add compelling, appetite-appealing language to menu items",
    confidence: 0.89,
    action: {
      label: "Generate Text",
      callback: () => {},
    },
    details: {
      targets: elements.filter((e) => e.type === "menu-item").length,
      style: "gastronomic",
    },
  },
  {
    id: "content-allergen-highlights",
    type: "content",
    title: "Add Allergen Callouts",
    description: "Strategically place allergen and dietary information",
    confidence: 0.79,
    action: {
      label: "Add Callouts",
      callback: () => {},
    },
    details: {
      visibility: "discreet",
      placement: "intelligent",
    },
  },
];

const generateCompositionSuggestions = (elementCount: number): AI3Suggestion[] => [
  {
    id: "composition-balance",
    type: "composition",
    title: "Visual Balance Check",
    description: `Analyzes ${elementCount} elements for optimal visual weight distribution`,
    confidence: 0.91,
    action: {
      label: "Analyze",
      callback: () => {},
    },
    details: {
      metrics: ["whitespace", "weight", "focal-point"],
    },
  },
  {
    id: "composition-negative-space",
    type: "composition",
    title: "Optimize Negative Space",
    description: "Improve readability and elegance through strategic spacing",
    confidence: 0.86,
    action: {
      label: "Optimize",
      callback: () => {},
    },
    details: {
      strategy: "golden-ratio",
    },
  },
];

export const AI3SuggestionsPanel: React.FC<AI3SuggestionsPanelProps> = ({
  elements,
  selectedElementId,
  onApplySuggestion,
  onGenerateLayouts,
  onEnhanceContent,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const all: AI3Suggestion[] = [
      ...generateLayoutSuggestions(elements.length),
      ...generateTypographySuggestions(elements),
      ...generateContentSuggestions(elements),
      ...generateCompositionSuggestions(elements.length),
    ];
    return all.sort((a, b) => b.confidence - a.confidence);
  }, [elements]);

  const layoutSuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "layout"),
    [suggestions],
  );

  const typographySuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "typography"),
    [suggestions],
  );

  const colorSuggestions = useMemo(() => {
    const palettes = generateColorPalettes();
    return palettes.map((palette) => ({
      id: palette.id,
      type: "color" as const,
      title: palette.name,
      description: `Perfect for ${palette.occasion} settings`,
      confidence: 0.85,
      action: {
        label: "Apply Palette",
        callback: () => {},
      },
      details: palette,
    }));
  }, []);

  const contentSuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "content"),
    [suggestions],
  );

  const compositionSuggestions = useMemo(
    () => suggestions.filter((s) => s.type === "composition"),
    [suggestions],
  );

  const handleApplySuggestion = useCallback(
    async (suggestion: AI3Suggestion) => {
      setLoadingId(suggestion.id);
      try {
        // Simulate AI processing
        await new Promise((resolve) => setTimeout(resolve, 800));
        onApplySuggestion(suggestion);
      } finally {
        setLoadingId(null);
      }
    },
    [onApplySuggestion],
  );

  const SuggestionCard: React.FC<{ suggestion: AI3Suggestion; type?: string }> = ({
    suggestion,
    type,
  }) => (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background hover:border-primary/50 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-sm leading-tight text-foreground">
              {suggestion.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {suggestion.description}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="ml-2 whitespace-nowrap bg-primary/20 text-primary"
          >
            {Math.round(suggestion.confidence * 100)}%
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={() => handleApplySuggestion(suggestion)}
          disabled={loadingId === suggestion.id}
          className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loadingId === suggestion.id ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-3 w-3" />
              {suggestion.action.label}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const ColorPaletteCard: React.FC<{ suggestion: AI3Suggestion }> = ({ suggestion }) => {
    const colors = suggestion.details?.colors || [];
    const name = suggestion.details?.name || "Palette";
    return (
      <Card className="border-primary/30 bg-background hover:border-primary/50 transition-all overflow-hidden">
        <div className="flex h-16 w-full">
          {colors.map((color: string, idx: number) => (
            <div
              key={`color-${color}-${idx}`}
              className="flex-1 transition-opacity hover:opacity-80"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm text-foreground">{suggestion.title}</h3>
            <p className="text-xs text-muted-foreground">
              {suggestion.details?.occasion}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleApplySuggestion(suggestion)}
            disabled={loadingId === suggestion.id}
            className="w-full rounded-lg"
            variant="outline"
          >
            {loadingId === suggestion.id ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Palette className="mr-2 h-3 w-3" />
                Apply Palette
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
            AI³ Design Intelligence
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Smart suggestions powered by {elements.length} elements on canvas
        </p>
      </div>

      <Separator className="bg-primary/20" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-4">
        <TabsList className="grid w-full grid-cols-5 bg-background/80 border border-primary/30 rounded-lg">
          <TabsTrigger value="all" className="text-[10px]">
            All
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[10px]">
            <Layout className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="type" className="text-[10px]">
            <Type className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-[10px]">
            <Palette className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="content" className="text-[10px]">
            <Sparkles className="h-3 w-3" />
          </TabsTrigger>
        </TabsList>

        {/* All Suggestions */}
        <TabsContent value="all" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Layout Suggestions */}
        <TabsContent value="layout" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {layoutSuggestions.length > 0 ? (
                layoutSuggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No layout suggestions available
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Typography Suggestions */}
        <TabsContent value="type" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {typographySuggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Color Palettes */}
        <TabsContent value="colors" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {colorSuggestions.map((suggestion) => (
                <ColorPaletteCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Content Suggestions */}
        <TabsContent value="content" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {[...contentSuggestions, ...compositionSuggestions].map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="px-4 pb-4 space-y-2 border-t border-primary/20 pt-4">
        <Button
          size="sm"
          variant="outline"
          className="w-full border-primary/40 text-primary hover:bg-primary/10 text-xs"
          onClick={() => onGenerateLayouts("auto")}
        >
          <Layout className="mr-2 h-3 w-3" />
          Generate from Dish Assembly
        </Button>
      </div>
    </div>
  );
};

export default AI3SuggestionsPanel;
