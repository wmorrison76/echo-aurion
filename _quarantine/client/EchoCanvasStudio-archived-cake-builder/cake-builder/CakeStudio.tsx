import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ThreeCake from "./ThreeCake";
import ThreeCakeViewerWithTextures from "./ThreeCakeViewerWithTextures";
import FillingPicker from "./FillingPicker";
import GraphicGeneratorPanel from "./GraphicGeneratorPanel";
import LayerGeneratorPanel from "./LayerGeneratorPanel";
import IntakePrescreen from "./IntakePrescreen";
import RecipeManager from "./RecipeManager";
import LaunchBar from "./LaunchBar";
import NewOrderForm from "./NewOrderForm";
import StudioTabs from "./StudioTabs";
import AllergenManager from "./AllergenManager";
import AdvancedPricing from "./AdvancedPricing";
import DeliveryScheduler from "./DeliveryScheduler";
import YieldCalculator from "./YieldCalculator";
import AdminPanel from "./AdminPanel";
import CakeLayerGenerationOrchestrator from "./CakeLayerGenerationOrchestrator";
import DecorationGenerationOrchestrator from "./DecorationGenerationOrchestrator";
import VideoExportPanel from "./VideoExportPanel";
import SnapshotPanel from "./SnapshotPanel";
import type { CakeLayer } from "@/shared/types";
import type { Decoration } from "@/lib/decoration-types";
import { useCakeDecorations } from "@/hooks/use-cake-decorations";

import { DesignData, TierSpec, GalleryItem, IntakeAnswers } from "./types";
import { priceEstimate, recommendTiers, estimateServings } from "./logic";
import { loadSettings, saveSettings } from "./settings";
import { createTextureCanvas, TEXTURE_PRESETS } from "./textures";
import { clearTextureCache } from "@/lib/three-cake-texture-loader";
import { clearQueueFromStorage } from "@/lib/cake-layer-queue";

const DEFAULT_DESIGN: DesignData = {
  guests: 50,
  shape: "round",
  tiers: [
    { diameter: 8, height: 4 },
    { diameter: 6, height: 4 },
  ],
  baseFlavor: "Vanilla Bean",
  frosting: "Buttercream",
  fillings: ["Raspberry Jam"],
  color: "#d4a373",
  stand: "none",
  decorations: [],
  crumbCoat: true,
  sliceAngle: 0,
  frostingTexture: "smooth",
  bumpIntensity: 0.5,
  frostingThickness: 0.25,
  fillingColor: "#c41e3a",
  cakeColorHex: "#daa520",
  fillingLayers: 1,
  theme: "classic",
  studioBg: "white",
  lights: { key: 1.5, fill: 1, rim: 1 },
  crumbPattern: "plain",
  interLayerFrosting: true,
  interLayerFrostingThickness: 0.1,
  graphicWrap: null,
  assemblyMode: false,
  layers: [],
  composedImageUrl: undefined,
  lastComposedAt: undefined,
};

interface CakeStudioProps {
  onSave?: (design: DesignData, name: string) => void;
}

export default function CakeStudio({ onSave }: CakeStudioProps) {
  const [design, setDesign] = useState<DesignData>(DEFAULT_DESIGN);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [showIntake, setShowIntake] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [allergenProfile, setAllergenProfile] = useState({
    allergens: [] as string[],
    dietaryRestrictions: [] as string[],
    severeAllergies: [] as string[],
    crossContaminationRisk: false,
    notes: "",
  });
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(
    null,
  );
  const [showGeneration, setShowGeneration] = useState(false);
  const [approvedLayers, setApprovedLayers] = useState<CakeLayer[]>([]);
  const decorations = useCakeDecorations({
    maxDecorations: 20,
    autoSave: true,
    persistToLocalStorage: true,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settings = loadSettings();

  const pricing = priceEstimate(design);
  const servings = estimateServings(design.tiers, design.shape);

  const handleDesignChange = <K extends keyof DesignData>(
    key: K,
    value: any,
  ) => {
    setDesign((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddTier = () => {
    const newTier: TierSpec = {
      diameter: Math.max(4, (design.tiers[0]?.diameter || 8) - 2),
      height: 4,
    };
    handleDesignChange("tiers", [...design.tiers, newTier]);
  };

  const handleRemoveTier = (idx: number) => {
    handleDesignChange(
      "tiers",
      design.tiers.filter((_, i) => i !== idx),
    );
  };

  const handleUpdateTier = (idx: number, key: keyof TierSpec, value: any) => {
    const newTiers = [...design.tiers];
    newTiers[idx] = { ...newTiers[idx], [key]: value };
    handleDesignChange("tiers", newTiers);
  };

  const handleIntakeComplete = (answers: IntakeAnswers) => {
    const newTiers = recommendTiers(answers.guestCount);
    setDesign((prev) => ({
      ...prev,
      guests: answers.guestCount,
      tiers: newTiers,
      shape: answers.tiersShape as any,
      eventDate: answers.eventDate,
      tiersShape: answers.tiersShape,
    }));

    // Clear all caches before starting fresh generation
    clearTextureCache();
    clearQueueFromStorage(design.id);

    // Store intake answers and show generation orchestrator
    setIntakeAnswers(answers);
    setShowIntake(false);
    setShowGeneration(true);
  };

  const handleSaveDesign = () => {
    if (!savedName) return;
    const newItem: GalleryItem = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      name: savedName,
      design,
      imageDataUrl: canvasRef.current?.toDataURL() || "",
      price: pricing,
    };
    setGallery([newItem, ...gallery]);
    setSavedName("");
    onSave?.(design, savedName);
  };

  const handleLoadDesign = (item: GalleryItem) => {
    setDesign(item.design);
  };

  const handleRecommendTiers = () => {
    const newTiers = recommendTiers(design.guests);
    handleDesignChange("tiers", newTiers);
  };

  const handleLayersChange = (layers: any[]) => {
    handleDesignChange("layers", layers);
  };

  const handleComposedImage = (imageUrl: string) => {
    handleDesignChange("composedImageUrl", imageUrl);
  };

  const handleGenerationComplete = (success: boolean) => {
    if (success) {
      // Retrieve approved layers from orchestrator
      const api = (window as any).__cakeOrchestratorAPI;
      if (api) {
        const layers = api.getApprovedLayers();
        setApprovedLayers(layers);
      }

      // Generation approved - hide orchestrator and show studio
      setShowGeneration(false);
    } else {
      // Generation failed - show error and allow retry
      alert("Generation failed. Please try again.");
      setShowGeneration(false);
      setIntakeAnswers(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <LaunchBar />

      {showIntake ? (
        <div className="container max-w-2xl mx-auto py-6">
          <IntakePrescreen
            onComplete={handleIntakeComplete}
            onCancel={() => setShowIntake(false)}
          />
        </div>
      ) : showGeneration && intakeAnswers ? (
        <div className="container max-w-4xl mx-auto py-6">
          <CakeLayerGenerationOrchestrator
            intakeAnswers={intakeAnswers}
            designId={design.id || "studio-" + Date.now()}
            onGenerationComplete={handleGenerationComplete}
            autoStart={true}
          />
        </div>
      ) : (
        <div className="container mx-auto py-4 space-y-6">
          {/* Main Studio Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Canvas/Preview */}
            <div className="lg:col-span-1">
              {approvedLayers.length > 0 ? (
                <ThreeCakeViewerWithTextures
                  design={design}
                  approvedLayers={approvedLayers}
                  width={280}
                  height={350}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ThreeCake design={design} width={280} height={350} />
                  </CardContent>
                </Card>
              )}

              {/* Pricing Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Servings:</span>
                    <strong>{servings}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <strong>${pricing.basePrice}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Decorations:</span>
                    <strong>${pricing.decorations}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Stand:</span>
                    <strong>${pricing.stand}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Complexity:</span>
                    <strong>${pricing.complexity}</strong>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${pricing.total}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="tiers">Tiers</TabsTrigger>
                  <TabsTrigger value="frosting">Frosting</TabsTrigger>
                  <TabsTrigger value="layers">Layers</TabsTrigger>
                  <TabsTrigger value="decorations">Decorations</TabsTrigger>
                  <TabsTrigger value="export">Export</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Shape
                    </label>
                    <select
                      value={design.shape}
                      onChange={(e) =>
                        handleDesignChange("shape", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      <option value="round">Round</option>
                      <option value="square">Square</option>
                      <option value="sheet">Sheet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Guest Count
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={design.guests}
                        onChange={(e) =>
                          handleDesignChange("guests", Number(e.target.value))
                        }
                      />
                      <Button onClick={handleRecommendTiers} variant="outline">
                        Recommend Tiers
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Base Flavor
                    </label>
                    <select
                      value={design.baseFlavor}
                      onChange={(e) =>
                        handleDesignChange("baseFlavor", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      {settings.flavors.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Frosting Type
                    </label>
                    <select
                      value={design.frosting}
                      onChange={(e) =>
                        handleDesignChange("frosting", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      {settings.frostings.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Frosting Color
                    </label>
                    <Input
                      type="color"
                      value={design.color}
                      onChange={(e) =>
                        handleDesignChange("color", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Fillings
                    </label>
                    <FillingPicker
                      value={design.fillings}
                      onChange={(fillings) =>
                        handleDesignChange("fillings", fillings)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Theme
                    </label>
                    <select
                      value={design.theme || "classic"}
                      onChange={(e) =>
                        handleDesignChange("theme", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      <option value="classic">Classic</option>
                      <option value="birthday">Birthday</option>
                      <option value="holiday">Holiday</option>
                    </select>
                  </div>
                </TabsContent>

                {/* Tiers Tab */}
                <TabsContent value="tiers" className="space-y-4">
                  <div className="space-y-3">
                    {design.tiers.map((tier, idx) => (
                      <Card key={idx} className="p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm">
                            Tier {idx + 1}
                          </h4>
                          {design.tiers.length > 1 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveTier(idx)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        {design.shape !== "sheet" && (
                          <div>
                            <label className="text-xs">Diameter (inches)</label>
                            <Input
                              type="number"
                              value={tier.diameter || 0}
                              onChange={(e) =>
                                handleUpdateTier(
                                  idx,
                                  "diameter",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs">Height (inches)</label>
                          <Input
                            type="number"
                            value={tier.height}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "height",
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button onClick={handleAddTier} className="w-full">
                    Add Tier
                  </Button>
                </TabsContent>

                {/* Frosting Tab */}
                <TabsContent value="frosting" className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Texture
                    </label>
                    <select
                      value={design.frostingTexture || "smooth"}
                      onChange={(e) =>
                        handleDesignChange("frostingTexture", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      {TEXTURE_PRESETS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Bump Intensity:{" "}
                      {Math.round((design.bumpIntensity || 0) * 100)}%
                    </label>
                    <Slider
                      value={[(design.bumpIntensity || 0.5) * 100]}
                      onValueChange={(v) =>
                        handleDesignChange("bumpIntensity", v[0] / 100)
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Thickness (inches)
                    </label>
                    <Input
                      type="number"
                      step="0.05"
                      value={design.frostingThickness || 0.25}
                      onChange={(e) =>
                        handleDesignChange(
                          "frostingThickness",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>

                  <GraphicGeneratorPanel
                    onApply={(url) =>
                      handleDesignChange("graphicWrap", {
                        url,
                        opacity: 0.8,
                        tint: "#ffffff",
                      })
                    }
                  />
                </TabsContent>

                {/* Layers Tab */}
                <TabsContent value="layers" className="space-y-4">
                  <LayerGeneratorPanel
                    designId={`cake-${Date.now()}`}
                    onLayersChange={handleLayersChange}
                    onComposedImage={handleComposedImage}
                  />
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Stand Type
                    </label>
                    <select
                      value={design.stand}
                      onChange={(e) =>
                        handleDesignChange("stand", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      <option value="none">None</option>
                      <option value="gold">Gold</option>
                      <option value="acrylic">Acrylic</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">
                      Background
                    </label>
                    <select
                      value={design.studioBg || "white"}
                      onChange={(e) =>
                        handleDesignChange("studioBg", e.target.value)
                      }
                      className="w-full border rounded p-2"
                    >
                      <option value="white">White</option>
                      <option value="soft">Soft Gray</option>
                      <option value="black">Black</option>
                      <option value="peach">Peach</option>
                      <option value="gradient">Gradient</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.crumbCoat}
                      onChange={(e) =>
                        handleDesignChange("crumbCoat", e.target.checked)
                      }
                    />
                    <label className="text-sm">Crumb Coat Layer</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.animateBuild}
                      onChange={(e) =>
                        handleDesignChange("animateBuild", e.target.checked)
                      }
                    />
                    <label className="text-sm">Animate Build Process</label>
                  </div>
                </TabsContent>

                {/* Decorations Tab */}
                <TabsContent value="decorations" className="space-y-4">
                  <DecorationGenerationOrchestrator
                    onDecorationsUpdate={(updatedDecorations) => {
                      // Update design with decorations
                      handleDesignChange("decorations", updatedDecorations);
                    }}
                    isVisible={true}
                  />
                </TabsContent>

                {/* Export Tab */}
                <TabsContent value="export" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <VideoExportPanel
                      canvas={canvasRef.current}
                      animationDuration={10000}
                    />
                    <SnapshotPanel
                      canvas={canvasRef.current}
                      animationDuration={10000}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Allergen Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Allergens & Dietary</CardTitle>
            </CardHeader>
            <CardContent>
              <AllergenManager
                profile={allergenProfile}
                onChange={setAllergenProfile}
              />
            </CardContent>
          </Card>

          {/* Yield Calculator */}
          <YieldCalculator
            currentTiers={design.tiers}
            currentShape={design.shape}
            guestCount={design.guests}
            onTiersUpdate={(tiers) => handleDesignChange("tiers", tiers)}
          />

          {/* Advanced Pricing */}
          <AdvancedPricing design={design} pricing={pricing} />

          {/* Delivery Scheduler */}
          <DeliveryScheduler
            eventDate={design.eventDate}
            tiersCount={design.tiers.length}
            complexity={design.tiers.length > 2 ? "intricate" : "simple"}
            onScheduleChange={(schedule) => {
              console.log("Schedule updated:", schedule);
            }}
          />

          {/* Admin Panel */}
          <AdminPanel />

          {/* Save/Gallery Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Save Design</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Design name"
                  value={savedName}
                  onChange={(e) => setSavedName(e.target.value)}
                />
                <Button
                  onClick={handleSaveDesign}
                  disabled={!savedName}
                  className="w-full"
                >
                  Save to Gallery
                </Button>
              </CardContent>
            </Card>

            {gallery.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Saved Designs ({gallery.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gallery.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleLoadDesign(item)}
                        className="w-full text-left p-2 border rounded hover:bg-muted"
                      >
                        <div className="font-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${item.price.total}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Additional Sections */}
          <Button
            onClick={() => setShowIntake(true)}
            variant="outline"
            className="w-full"
          >
            Start Client Intake Form
          </Button>

          <NewOrderForm />
          <RecipeManager />
        </div>
      )}
    </div>
  );
}
