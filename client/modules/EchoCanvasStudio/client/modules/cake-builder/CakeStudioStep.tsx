import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DALLECakePreview from "./DALLECakePreview";
import FillingPicker from "./FillingPicker";
import CakeSizeSelector from "../../components/cake-builder/CakeSizeSelector";
import GraphicGeneratorPanel from "./GraphicGeneratorPanel";
import LayerGeneratorPanel from "./LayerGeneratorPanel";
import RecipeManager from "./RecipeManager";
import LaunchBar from "./LaunchBar";
import AllergenManager from "./AllergenManager";
import AdvancedPricing from "./AdvancedPricing";
import DeliveryScheduler from "./DeliveryScheduler";
import YieldCalculator from "./YieldCalculator";
import AdminPanel from "./AdminPanel";
import type { CakeLayer } from "@/shared/types";
import { useCakeDecorations } from "@/hooks/use-cake-decorations";
import { DesignData, TierSpec, GalleryItem, IntakeAnswers } from "./types";
import { priceEstimate, recommendTiers, estimateServings } from "./logic";
import { loadSettings } from "./settings";
import { createTextureCanvas, TEXTURE_PRESETS } from "./textures";

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

interface CakeStudioStepProps {
  intakeAnswers: IntakeAnswers;
  onComplete: (design: DesignData) => void;
  onBack: () => void;
}

export default function CakeStudioStep({
  intakeAnswers,
  onComplete,
  onBack,
}: CakeStudioStepProps) {
  const [design, setDesign] = useState<DesignData>(() => ({
    ...DEFAULT_DESIGN,
    guests: intakeAnswers.guestCount,
    shape: (intakeAnswers.tiersShape as any) || "round",
    tiers: recommendTiers(intakeAnswers.guestCount, intakeAnswers.tierCount),
    eventDate: intakeAnswers.eventDate,
  }));
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [savedName, setSavedName] = useState("");
  const [approvedLayers, setApprovedLayers] = useState<CakeLayer[]>([]);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content: `Great! I can see you're planning a cake for ${intakeAnswers.guestCount} guests. What colors and flavors are you thinking about?`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

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

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSendingChat(true);

    try {
      const response = await fetch("/api/ai-design-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          design,
          intakeAnswers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);

        if (data.designSuggestions) {
          setDesign((prev) => ({ ...prev, ...data.designSuggestions }));
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I encountered an error. Please try again or adjust your design manually.",
          },
        ]);
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please check your internet and try again.",
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleLayersChange = (layers: any[]) => {
    handleDesignChange("layers", layers);
  };

  return (
    <div className="w-full space-y-4">
      <LaunchBar />

      <div className="container mx-auto py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Step 2: Design Your Cake</h2>
            <p className="text-gray-600 text-sm mt-1">
              Use the controls on the left to refine your design. The AI on the
              right can answer questions and provide suggestions.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#1a1a2e",
              border: "2px solid #00f0ff",
              borderRadius: "8px",
              padding: "12px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
              Total Price
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#00f0ff",
              }}
            >
              ${pricing.total}
            </div>
          </div>
        </div>

        {/* Main Grid: Left (Design Controls) + Right (Chat) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Design Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Preview Card */}
            <div className="lg:col-span-1">
              <DALLECakePreview design={design} width={280} height={350} />
            </div>

            {/* Tabs for Design Options */}
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="tiers">Tiers</TabsTrigger>
                <TabsTrigger value="frosting">Frosting</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="decorations">Decorations</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">
                    Cake Size & Shape
                  </label>
                  <CakeSizeSelector
                    selectedSize={
                      design.tiers[0]?.diameter
                        ? `${design.tiers[0].diameter}"`
                        : '8"'
                    }
                    selectedShape={design.shape as "round" | "square" | "sheet"}
                    onSizeChange={(size, shape) => {
                      handleDesignChange("shape", shape);
                      const diameter = parseInt(size);
                      if (design.tiers.length > 0) {
                        const newTiers = [...design.tiers];
                        newTiers[0] = { ...newTiers[0], diameter };
                        handleDesignChange("tiers", newTiers);
                      }
                    }}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cake Flavor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <select
                      value={design.baseFlavor}
                      onChange={(e) =>
                        handleDesignChange("baseFlavor", e.target.value)
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="Vanilla Bean">Vanilla Bean</option>
                      <option value="Chocolate">Chocolate</option>
                      <option value="Red Velvet">Red Velvet</option>
                      <option value="Carrot">Carrot</option>
                      <option value="Lemon">Lemon</option>
                    </select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Frosting Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <select
                      value={design.frosting}
                      onChange={(e) =>
                        handleDesignChange("frosting", e.target.value)
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="Buttercream">Buttercream</option>
                      <option value="Cream Cheese">Cream Cheese</option>
                      <option value="Fondant">Fondant</option>
                      <option value="Ganache">Ganache</option>
                    </select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Color</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      type="color"
                      value={design.color}
                      onChange={(e) =>
                        handleDesignChange("color", e.target.value)
                      }
                      className="w-full h-12 rounded-lg cursor-pointer"
                    />
                  </CardContent>
                </Card>

                <FillingPicker
                  fillings={design.fillings}
                  onFillingChange={(fillings) =>
                    handleDesignChange("fillings", fillings)
                  }
                />
              </TabsContent>

              {/* Tiers Tab */}
              <TabsContent value="tiers" className="space-y-4">
                <div className="space-y-4">
                  {design.tiers.map((tier, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">
                            Tier {idx + 1}
                          </CardTitle>
                          {design.tiers.length > 1 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveTier(idx)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {design.shape !== "sheet" && (
                          <div>
                            <label className="text-sm font-semibold block mb-2">
                              Diameter (inches)
                            </label>
                            <Slider
                              value={[tier.diameter || 8]}
                              onValueChange={(val) =>
                                handleUpdateTier(idx, "diameter", val[0])
                              }
                              min={4}
                              max={16}
                              step={1}
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-semibold block mb-2">
                            Height (inches)
                          </label>
                          <Slider
                            value={[tier.height || 4]}
                            onValueChange={(val) =>
                              handleUpdateTier(idx, "height", val[0])
                            }
                            min={2}
                            max={8}
                            step={0.5}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button onClick={handleAddTier} className="w-full">
                  Add Tier
                </Button>
              </TabsContent>

              {/* Frosting Tab */}
              <TabsContent value="frosting" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Frosting Texture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={design.frostingTexture || "smooth"}
                      onChange={(e) =>
                        handleDesignChange(
                          "frostingTexture",
                          e.target.value as any,
                        )
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="smooth">Smooth</option>
                      <option value="rustic">Rustic</option>
                      <option value="ridged">Ridged</option>
                    </select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Thickness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      value={[design.frostingThickness || 0.25]}
                      onValueChange={(val) =>
                        handleDesignChange("frostingThickness", val[0])
                      }
                      min={0.1}
                      max={0.5}
                      step={0.05}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Layers Tab */}
              <TabsContent value="layers" className="space-y-4">
                <LayerGeneratorPanel
                  onLayersChange={handleLayersChange}
                  design={design}
                />
              </TabsContent>

              {/* Decorations Tab */}
              <TabsContent value="decorations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Decorations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Decoration options coming soon...
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Export Tab */}
              <TabsContent value="export" className="space-y-4">
                <GraphicGeneratorPanel design={design} />
              </TabsContent>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-4">
                <DeliveryScheduler
                  design={design}
                  onScheduleChange={() => {}}
                />
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4">
                <AdvancedPricing design={design} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Side: Chat Panel */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">AI Design Assistant</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-sm p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-cyan-500 text-white ml-4"
                          : "bg-gray-100 text-gray-900 mr-4"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isSendingChat && (
                    <div className="text-sm p-3 rounded-lg bg-gray-100 text-gray-900 mr-4">
                      Thinking...
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="space-y-2 border-t pt-3">
                  <Input
                    placeholder="Ask about colors, flavors, decorations..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    disabled={isSendingChat}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleSendChatMessage}
                    disabled={isSendingChat || !chatInput.trim()}
                    className="w-full"
                    size="sm"
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={() => onComplete(design)}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            Continue to Summary →
          </Button>
        </div>
      </div>
    </div>
  );
}
