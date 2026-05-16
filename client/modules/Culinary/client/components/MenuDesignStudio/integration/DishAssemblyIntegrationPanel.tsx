import React, { useState, useCallback, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  ChefHat,
  Layout,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { DesignerElement } from "../hooks";
import { DishAssemblyBridge, type DishData } from "./DishAssemblyBridge";

interface DishAssemblyIntegrationPanelProps {
  dishes?: DishData[];
  onGenerateDesign: (elements: Omit<DesignerElement, "id">[], config: any) => void;
  onError?: (error: string) => void;
}

type LayoutStyle = "grid" | "list" | "featured" | "multi-column";
type ColorTheme = "elegant" | "modern" | "vibrant" | "luxury";
type TypographyStyle = "classic" | "modern" | "premium" | "contemporary";

interface DesignConfig {
  layout: LayoutStyle;
  colorTheme: ColorTheme;
  typography: TypographyStyle;
  includeImages: boolean;
  includeAllergens: boolean;
  includePopularity: boolean;
}

const defaultConfig: DesignConfig = {
  layout: "featured",
  colorTheme: "elegant",
  typography: "classic",
  includeImages: true,
  includeAllergens: true,
  includePopularity: true,
};

const layoutDescriptions: Record<LayoutStyle, string> = {
  grid: "Organized grid layout perfect for browsing multiple items",
  list: "Vertical list format ideal for sequential ordering",
  featured: "Hero item with supporting menu items below",
  "multi-column": "Two-column layout for balanced presentation",
};

const colorThemeDescriptions: Record<ColorTheme, string> = {
  elegant: "Warm tones perfect for fine dining and upscale venues",
  modern: "Clean contemporary palette for modern restaurants",
  vibrant: "Bold colors ideal for casual dining and trendy spots",
  luxury: "Dark sophisticated tones for premium establishments",
};

export const DishAssemblyIntegrationPanel: React.FC<DishAssemblyIntegrationPanelProps> = ({
  dishes = [],
  onGenerateDesign,
  onError,
}) => {
  const [config, setConfig] = useState<DesignConfig>(defaultConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState<string[]>(
    dishes.slice(0, 5).map((d) => d.id)
  );

  const handleLayoutChange = useCallback((layout: LayoutStyle) => {
    setConfig((prev) => ({ ...prev, layout }));
  }, []);

  const handleColorThemeChange = useCallback((colorTheme: ColorTheme) => {
    setConfig((prev) => ({ ...prev, colorTheme }));
  }, []);

  const handleTypographyChange = useCallback((typography: TypographyStyle) => {
    setConfig((prev) => ({ ...prev, typography }));
  }, []);

  const selectedDishObjects = useMemo(
    () => dishes.filter((d) => selectedDishes.includes(d.id)),
    [dishes, selectedDishes]
  );

  const handleGenerateDesign = useCallback(async () => {
    try {
      if (selectedDishObjects.length === 0) {
        onError?.("Please select at least one dish");
        return;
      }

      setIsGenerating(true);

      // Generate menu design from selected dishes
      const elements = DishAssemblyBridge.generateMenuFromDishes(
        selectedDishObjects,
        config.layout
      );

      // Get color and typography recommendations
      const colors = DishAssemblyBridge.getColorRecommendations(
        selectedDishObjects,
        config.colorTheme
      );
      const typography = DishAssemblyBridge.getTypographyRecommendations(
        selectedDishObjects,
        config.typography
      );

      // Pass to parent component
      onGenerateDesign(elements, {
        colors,
        typography,
        config,
      });

      // Simulate processing delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Failed to generate design");
    } finally {
      setIsGenerating(false);
    }
  }, [selectedDishObjects, config, onGenerateDesign, onError]);

  const handleSelectAll = useCallback(() => {
    setSelectedDishes(dishes.map((d) => d.id));
  }, [dishes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedDishes([]);
  }, []);

  const handleToggleDish = useCallback((dishId: string) => {
    setSelectedDishes((prev) =>
      prev.includes(dishId)
        ? prev.filter((id) => id !== dishId)
        : [...prev, dishId]
    );
  }, []);

  if (dishes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <ChefHat className="h-12 w-12 text-primary/30 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              No Dishes Connected
            </p>
            <p className="text-xs text-muted-foreground">
              Import dishes from Dish Assembly to generate menu designs
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
            AI³ Menu Generator
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Create professional menus from {dishes.length} completed dish{dishes.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1 px-4">
        <Tabs defaultValue="dishes" className="w-full space-y-4 pb-4">
          <TabsList className="grid w-full grid-cols-2 bg-background/80 border border-primary/30 rounded-lg">
            <TabsTrigger value="dishes" className="text-xs">
              Select Dishes
            </TabsTrigger>
            <TabsTrigger value="design" className="text-xs">
              Design Settings
            </TabsTrigger>
          </TabsList>

          {/* Dishes Tab */}
          <TabsContent value="dishes" className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
                className="flex-1 text-xs h-8"
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeselectAll}
                className="flex-1 text-xs h-8"
              >
                Deselect All
              </Button>
            </div>

            <div className="space-y-2">
              {dishes.map((dish) => (
                <Card
                  key={dish.id}
                  className="border-primary/20 bg-background/50 cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => handleToggleDish(dish.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDishes.includes(dish.id)}
                        onChange={() => handleToggleDish(dish.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-primary/40"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">
                          {dish.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {dish.description}
                        </p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {dish.currency} {dish.price.toFixed(2)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            {Math.round(dish.popularity || 0)}% popular
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              {selectedDishes.length} of {dishes.length} dishes selected
            </div>
          </TabsContent>

          {/* Design Settings Tab */}
          <TabsContent value="design" className="space-y-4">
            {/* Layout Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Layout Style</h4>
              <RadioGroup value={config.layout} onValueChange={handleLayoutChange as any}>
                {(Object.keys(layoutDescriptions) as LayoutStyle[]).map((layout) => (
                  <div key={layout} className="flex items-start gap-3 p-2 rounded hover:bg-primary/5">
                    <RadioGroupItem value={layout} id={`layout-${layout}`} />
                    <Label
                      htmlFor={`layout-${layout}`}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <span className="text-xs font-semibold text-foreground capitalize">
                        {layout}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {layoutDescriptions[layout]}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Color Theme Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Color Palette</h4>
              <RadioGroup value={config.colorTheme} onValueChange={handleColorThemeChange as any}>
                {(Object.keys(colorThemeDescriptions) as ColorTheme[]).map((theme) => (
                  <div key={theme} className="flex items-start gap-3 p-2 rounded hover:bg-primary/5">
                    <RadioGroupItem value={theme} id={`color-${theme}`} />
                    <Label
                      htmlFor={`color-${theme}`}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <span className="text-xs font-semibold text-foreground capitalize">
                        {theme}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {colorThemeDescriptions[theme]}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Typography Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Typography</h4>
              <RadioGroup
                value={config.typography}
                onValueChange={handleTypographyChange as any}
              >
                <div className="flex items-start gap-3 p-2 rounded hover:bg-primary/5">
                  <RadioGroupItem value="classic" id="type-classic" />
                  <Label htmlFor="type-classic" className="flex-1 cursor-pointer space-y-1">
                    <span className="text-xs font-semibold text-foreground">Classic</span>
                    <span className="text-xs text-muted-foreground">
                      Serif headings with sans-serif body
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-2 rounded hover:bg-primary/5">
                  <RadioGroupItem value="modern" id="type-modern" />
                  <Label htmlFor="type-modern" className="flex-1 cursor-pointer space-y-1">
                    <span className="text-xs font-semibold text-foreground">Modern</span>
                    <span className="text-xs text-muted-foreground">
                      Contemporary sans-serif throughout
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-2 rounded hover:bg-primary/5">
                  <RadioGroupItem value="premium" id="type-premium" />
                  <Label htmlFor="type-premium" className="flex-1 cursor-pointer space-y-1">
                    <span className="text-xs font-semibold text-foreground">Premium</span>
                    <span className="text-xs text-muted-foreground">
                      High-contrast elegant serif
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-2 rounded hover:bg-primary/5">
                  <RadioGroupItem value="contemporary" id="type-contemporary" />
                  <Label htmlFor="type-contemporary" className="flex-1 cursor-pointer space-y-1">
                    <span className="text-xs font-semibold text-foreground">Contemporary</span>
                    <span className="text-xs text-muted-foreground">
                      Modern with geometric accents
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2 border-t border-primary/20 pt-4">
        <Button
          onClick={handleGenerateDesign}
          disabled={isGenerating || selectedDishObjects.length === 0}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Menu Design
            </>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          {selectedDishObjects.length === 0
            ? "Select dishes to generate a menu design"
            : `Ready to generate menu from ${selectedDishObjects.length} dish${selectedDishObjects.length !== 1 ? "es" : ""}`}
        </p>
      </div>
    </div>
  );
};

export default DishAssemblyIntegrationPanel;
