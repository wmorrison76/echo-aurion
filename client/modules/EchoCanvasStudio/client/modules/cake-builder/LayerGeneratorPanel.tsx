/**
 * Layer Generator Panel
 * UI for generating individual cake layers with transparent backgrounds
 * 
 * Features:
 * - Configure tier size and style
 * - Generate with AI (SDXL)
 * - View and manage generated layers
 * - Compose final cake
 */

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Loader, Trash2, RefreshCw, Plus } from "lucide-react";
import type { CakeLayer, LayerGenerationRequest } from "../../shared/types";
import {
  composeLayers,
  validateCompositionConfig,
  createCompositionFromTiers,
  generateCompositionFileName,
  type CompositionConfig,
} from "@/lib/layer-composition";
import { getApiBaseUrl } from "@/lib/luccca-integration";

export interface LayerGeneratorPanelProps {
  designId: string;
  onLayersChange?: (layers: CakeLayer[]) => void;
  onComposedImage?: (imageUrl: string) => void;
}

interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  progress: number;
}

export default function LayerGeneratorPanel({
  designId,
  onLayersChange,
  onComposedImage,
}: LayerGeneratorPanelProps) {
  // Configuration state
  const [diameterInches, setDiameterInches] = useState(10);
  const [heightInches, setHeightInches] = useState(4);
  const [shape, setShape] = useState<"round" | "square" | "rectangular">(
    "round"
  );
  const [frostingType, setFrostingType] = useState<
    "buttercream" | "fondant" | "ganache" | "cream-cheese"
  >("buttercream");
  const [frostingColor, setFrostingColor] = useState("#d4a373");
  const [texture, setTexture] = useState<
    "smooth" | "ridged" | "rustic" | "piped" | "painted"
  >("smooth");
  const [pattern, setPattern] = useState("");

  // Layers state
  const [layers, setLayers] = useState<CakeLayer[]>([]);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    progress: 0,
  });
  const [composedImageUrl, setComposedImageUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  /**
   * Generate layer image
   */
  const handleGenerateLayer = useCallback(async () => {
    try {
      setGenerationState({
        isGenerating: true,
        error: null,
        progress: 0,
      });

      const apiBaseUrl = getApiBaseUrl();
      const config: LayerGenerationRequest = {
        tier: {
          diameter: diameterInches,
          height: heightInches,
          shape,
        },
        style: {
          frosting: frostingType,
          color: frostingColor,
          texture,
          pattern: pattern || undefined,
        },
        transparent: true,
      };

      console.log("[LayerGenerator] Generating layer with config:", config);

      const response = await fetch(`${apiBaseUrl}/generate-layer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate layer");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // Create layer object
      const newLayer: CakeLayer = {
        id: crypto.randomUUID(),
        type: "tier",
        imageUrl: data.imageUrl,
        seed: data.metadata.seed,
        generatedWith: "sdxl",
        prompt: `${diameterInches}" ${shape} ${frostingType} cake with ${texture} ${frostingColor}`,
        metadata: {
          width: data.metadata.width,
          height: data.metadata.height,
          hasAlpha: data.metadata.hasAlpha,
          fileSize: 0,
          generatedAt: data.metadata.generatedAt,
          generationTimeMs: 0,
        },
        opacity: 1,
        position: { x: 0, y: 0 },
        zIndex: layers.length,
      };

      console.log("[LayerGenerator] Layer created:", newLayer.id);

      // Add to layers
      const updatedLayers = [...layers, newLayer];
      setLayers(updatedLayers);
      onLayersChange?.(updatedLayers);

      setGenerationState({
        isGenerating: false,
        error: null,
        progress: 100,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[LayerGenerator] Generation failed:", errorMessage);

      setGenerationState({
        isGenerating: false,
        error: errorMessage,
        progress: 0,
      });
    }
  }, [
    diameterInches,
    heightInches,
    shape,
    frostingType,
    frostingColor,
    texture,
    pattern,
    layers,
    onLayersChange,
  ]);

  /**
   * Delete layer
   */
  const handleDeleteLayer = useCallback((layerId: string) => {
    const updatedLayers = layers.filter((l) => l.id !== layerId);
    setLayers(updatedLayers);
    onLayersChange?.(updatedLayers);
  }, [layers, onLayersChange]);

  /**
   * Regenerate layer
   */
  const handleRegenerateLayer = useCallback(
    async (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      // Delete old layer
      handleDeleteLayer(layerId);

      // Regenerate
      await handleGenerateLayer();
    },
    [layers, handleDeleteLayer, handleGenerateLayer]
  );

  /**
   * Compose all layers into final cake
   */
  const handleCompose = useCallback(async () => {
    try {
      if (layers.length === 0) {
        setGenerationState({
          isGenerating: false,
          error: "No layers to compose",
          progress: 0,
        });
        return;
      }

      setIsComposing(true);
      setGenerationState({
        isGenerating: true,
        error: null,
        progress: 50,
      });

      // Validate configuration
      const tierImages = layers.map((layer) => ({
        imageUrl: layer.imageUrl,
        zIndex: layer.zIndex,
      }));

      const compositionConfig = createCompositionFromTiers(tierImages);

      const validation = validateCompositionConfig(compositionConfig);
      if (!validation.valid) {
        throw new Error(`Validation errors: ${validation.errors.join(", ")}`);
      }

      console.log(
        "[LayerGenerator] Composing",
        layers.length,
        "layers"
      );

      // Compose
      const result = await composeLayers(compositionConfig);

      console.log("[LayerGenerator] Composition complete", {
        size: result.size,
        width: result.width,
        height: result.height,
      });

      // Set preview
      setComposedImageUrl(result.dataUrl);
      onComposedImage?.(result.dataUrl);

      setGenerationState({
        isGenerating: false,
        error: null,
        progress: 100,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Composition failed";
      console.error("[LayerGenerator] Composition error:", errorMessage);

      setGenerationState({
        isGenerating: false,
        error: errorMessage,
        progress: 0,
      });
    } finally {
      setIsComposing(false);
    }
  }, [layers, onComposedImage]);

  /**
   * Update layer opacity
   */
  const handleUpdateLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      const updatedLayers = layers.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer
      );
      setLayers(updatedLayers);
      onLayersChange?.(updatedLayers);
    },
    [layers, onLayersChange]
  );

  return (
    <div className="space-y-4">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Layer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tier Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Diameter (inches)
              </label>
              <Input
                type="number"
                min="4"
                max="18"
                value={diameterInches}
                onChange={(e) => setDiameterInches(Number(e.target.value))}
                disabled={generationState.isGenerating}
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Height (inches)
              </label>
              <Input
                type="number"
                min="2"
                max="8"
                step="0.5"
                value={heightInches}
                onChange={(e) => setHeightInches(Number(e.target.value))}
                disabled={generationState.isGenerating}
              />
            </div>
          </div>

          {/* Shape Selection */}
          <div>
            <label className="text-sm font-semibold block mb-2">Shape</label>
            <Select
              value={shape}
              onValueChange={(value) =>
                setShape(value as "round" | "square" | "rectangular")
              }
              disabled={generationState.isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Round</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="rectangular">Rectangular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Frosting Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Frosting Type
              </label>
              <Select
                value={frostingType}
                onValueChange={(value) =>
                  setFrostingType(
                    value as
                      | "buttercream"
                      | "fondant"
                      | "ganache"
                      | "cream-cheese"
                  )
                }
                disabled={generationState.isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buttercream">Buttercream</SelectItem>
                  <SelectItem value="fondant">Fondant</SelectItem>
                  <SelectItem value="ganache">Ganache</SelectItem>
                  <SelectItem value="cream-cheese">Cream Cheese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={frostingColor}
                  onChange={(e) => setFrostingColor(e.target.value)}
                  disabled={generationState.isGenerating}
                  className="w-12 h-10"
                />
                <Input
                  type="text"
                  value={frostingColor}
                  onChange={(e) => setFrostingColor(e.target.value)}
                  disabled={generationState.isGenerating}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Texture Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Texture</label>
              <Select
                value={texture}
                onValueChange={(value) =>
                  setTexture(
                    value as
                      | "smooth"
                      | "ridged"
                      | "rustic"
                      | "piped"
                      | "painted"
                  )
                }
                disabled={generationState.isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smooth">Smooth</SelectItem>
                  <SelectItem value="ridged">Ridged</SelectItem>
                  <SelectItem value="rustic">Rustic</SelectItem>
                  <SelectItem value="piped">Piped</SelectItem>
                  <SelectItem value="painted">Painted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Pattern (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., rose-piping, basketweave"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                disabled={generationState.isGenerating}
              />
            </div>
          </div>

          {/* Error Display */}
          {generationState.error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700">
                  {generationState.error}
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateLayer}
            disabled={generationState.isGenerating}
            className="w-full"
          >
            {generationState.isGenerating ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Generating Layer...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate Layer
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Layers List Card */}
      {layers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Layers ({layers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {layers.map((layer, idx) => (
              <div key={layer.id} className="border rounded-lg p-3 space-y-2">
                {/* Layer Image */}
                <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                  <img
                    src={layer.imageUrl}
                    alt={`Layer ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Layer Info */}
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">
                    Layer {idx + 1} - {layer.type}
                  </p>
                  <p className="truncate">{layer.prompt}</p>
                </div>

                {/* Opacity Control */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">
                    Opacity: {Math.round(layer.opacity * 100)}%
                  </label>
                  <Slider
                    value={[layer.opacity]}
                    onValueChange={(value) =>
                      handleUpdateLayerOpacity(layer.id, value[0])
                    }
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateLayer(layer.id)}
                    disabled={generationState.isGenerating}
                    className="flex-1"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Regenerate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteLayer(layer.id)}
                    disabled={generationState.isGenerating}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Compose Button */}
            <Button
              onClick={handleCompose}
              disabled={isComposing || layers.length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isComposing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Composing...
                </>
              ) : (
                "Compose Final Cake"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Composed Image Preview */}
      {composedImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Final Cake Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded overflow-hidden">
              <img
                src={composedImageUrl}
                alt="Final cake composition"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
