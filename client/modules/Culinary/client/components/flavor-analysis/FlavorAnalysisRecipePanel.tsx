/**
 * Flavor Analysis Recipe Panel
 * 
 * Integrated wrapper that displays all 4 flavor analysis components together.
 * Easily embedded into EchoChefPanel, AddRecipeToolsPanel, or MenuDesignStudio.
 * 
 * Props:
 * - recipe: Recipe data object
 * - show: Whether to display the panel
 * - onOptimize: Callback when user requests optimization
 */

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { RadarChartFlavorFingerprint } from "./RadarChartFlavorFingerprint";
import { FlavorPleasureCurveChart } from "./FlavorPleasureCurveChart";
import { IngredientNetworkGraph } from "./IngredientNetworkGraph";
import { EchoFlavorSuggestionsPanel } from "./EchoFlavorSuggestionsPanel";

interface FlavorAnalysisRecipePanelProps {
  recipe: any;
  show?: boolean;
  onOptimize?: (recipe: any) => void;
  apiUrl?: string;
}

export const FlavorAnalysisRecipePanel: React.FC<
  FlavorAnalysisRecipePanelProps
> = ({ recipe, show = true, onOptimize, apiUrl = "/api" }) => {
  const [activeTab, setActiveTab] = useState("fingerprint");
  const [isOptimizing, setIsOptimizing] = useState(false);

  if (!show || !recipe) {
    return null;
  }

  // Convert recipe to JSON string for components
  const recipeJson = JSON.stringify(recipe);

  const handleOptimize = async () => {
    if (!onOptimize) return;

    setIsOptimizing(true);
    try {
      // Call optimization endpoint (will implement in Phase 6)
      // For now, just trigger the callback
      onOptimize(recipe);
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Card className="w-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Flavor Intelligence</h2>
          <p className="text-sm text-gray-600">
            Real-time sensory analysis powered by Echo AI³
          </p>
        </div>

        {onOptimize && (
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="w-4 h-4" />
            {isOptimizing ? "Optimizing..." : "Ask Echo to Optimize"}
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fingerprint">Fingerprint</TabsTrigger>
          <TabsTrigger value="pleasure">Pleasure Curve</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="fingerprint" className="space-y-4">
          <RadarChartFlavorFingerprint recipeJson={recipeJson} apiUrl={apiUrl} />
        </TabsContent>

        <TabsContent value="pleasure" className="space-y-4">
          <FlavorPleasureCurveChart recipeJson={recipeJson} apiUrl={apiUrl} />
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <IngredientNetworkGraph recipeJson={recipeJson} apiUrl={apiUrl} />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <EchoFlavorSuggestionsPanel recipeJson={recipeJson} apiUrl={apiUrl} />
        </TabsContent>
      </Tabs>

      <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
        <p>
          ✓ Analysis updated in real-time as recipe changes
        </p>
        <p>
          ✓ Powered by EchoAi³ Flavor Engine
        </p>
        <p>
          ✓ Use suggestions to optimize for guest satisfaction
        </p>
      </div>
    </Card>
  );
};

export default FlavorAnalysisRecipePanel;
