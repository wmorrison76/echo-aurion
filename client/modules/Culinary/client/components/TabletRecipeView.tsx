/**
 * Tablet-Optimized Recipe View
 *
 * Optimized layout and touch interactions for tablet devices
 */

import React, { useState } from "react";
const { useState } = React;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/glass";

interface TabletRecipeViewProps {
  recipe: {
    id: string;
    name: string;
    description?: string;
    ingredients: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
    }>;
    instructions: string[];
    imageUrl?: string;
  };
  onClose?: () => void;
}

export function TabletRecipeView({ recipe, onClose }: TabletRecipeViewProps) {
  const [activeTab, setActiveTab] = useState("ingredients");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleSwipeLeft = () => {
    if (activeTab === "ingredients") {
      setActiveTab("instructions");
    } else if (
      activeTab === "instructions" &&
      currentStep < recipe.instructions.length - 1
    ) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSwipeRight = () => {
    if (activeTab === "instructions" && currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else if (activeTab === "instructions") {
      setActiveTab("ingredients");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{recipe.name}</h1>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {recipe.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="h-12 w-12"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleResetZoom}
            className="h-12 w-12"
            aria-label="Reset zoom"
          >
            <RotateCw className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="h-12 w-12"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-6 w-6" />
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="h-12 px-6">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="flex-shrink-0 h-14 px-2">
            <TabsTrigger value="ingredients" className="text-base px-6">
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="instructions" className="text-base px-6">
              Instructions
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-base px-6">
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="ingredients"
            className="flex-1 overflow-y-auto p-6"
          >
            <div
              className="space-y-3"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
              }}
            >
              {recipe.ingredients.map((ingredient, idx) => (
                <Card key={ingredient.id} className="touch-manipulation">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xl font-semibold text-foreground">
                          {ingredient.name}
                        </p>
                        <p className="text-lg text-muted-foreground mt-1">
                          {ingredient.quantity} {ingredient.unit}
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-primary w-16 text-center">
                        {idx + 1}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent
            value="instructions"
            className="flex-1 overflow-y-auto p-6"
          >
            <div
              className="space-y-4"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
              }}
            >
              {/* Step Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    setCurrentStep((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentStep === 0}
                  className="h-14 px-6"
                >
                  <ChevronLeft className="h-6 w-6 mr-2" />
                  Previous
                </Button>
                <div className="text-lg font-semibold text-foreground">
                  Step {currentStep + 1} of {recipe.instructions.length}
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    setCurrentStep((prev) =>
                      Math.min(recipe.instructions.length - 1, prev + 1),
                    )
                  }
                  disabled={currentStep === recipe.instructions.length - 1}
                  className="h-14 px-6"
                >
                  Next
                  <ChevronRight className="h-6 w-6 ml-2" />
                </Button>
              </div>

              {/* Current Step */}
              <Card className="touch-manipulation min-h-[400px]">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Step {currentStep + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-xl leading-relaxed text-foreground">
                    {recipe.instructions[currentStep]}
                  </p>
                </CardContent>
              </Card>

              {/* Step Progress */}
              <div className="flex gap-2 justify-center mt-6">
                {recipe.instructions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "h-3 rounded-full transition-all",
                      idx === currentStep
                        ? "w-12 bg-primary"
                        : "w-3 bg-muted hover:bg-primary/50",
                    )}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Recipe notes and tips will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
