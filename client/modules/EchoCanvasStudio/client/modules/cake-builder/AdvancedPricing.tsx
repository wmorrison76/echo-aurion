import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DesignData, PricingBreakdown } from "./types";
import { priceEstimate } from "./logic";

interface PricingMatrixProps {
  design: DesignData;
  pricing: PricingBreakdown;
}

interface CostBreakdown {
  ingredientsCost: number;
  laborCost: number;
  deliveryCost: number;
  equipmentCost: number;
  markup: number;
  finalPrice: number;
}

export default function AdvancedPricing({
  design,
  pricing,
}: PricingMatrixProps) {
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    ingredientsCost: pricing.basePrice * 0.4, // 40% of base
    laborCost: pricing.basePrice * 0.35, // 35% of base
    deliveryCost: design.eventDate ? 35 : 0,
    equipmentCost: pricing.stand * 0.2,
    markup: pricing.basePrice * 0.25, // 25% profit margin
    finalPrice: pricing.total,
  });

  const [customPricing, setCustomPricing] = useState({
    basePerServing: 6,
    decorationRate: 12,
    tierComplexity: 20,
  });

  const handleCostChange = (key: keyof CostBreakdown, value: number) => {
    const updated = { ...costBreakdown, [key]: value };
    const total = Object.entries(updated)
      .filter(([k]) => k !== "finalPrice" && k !== "markup")
      .reduce((sum, [, v]) => sum + v, 0);
    updated.finalPrice = total + (updated.markup || 0);
    setCostBreakdown(updated);
  };

  const calculateByYieldGoal = (targetYield: number) => {
    const servingCost =
      (costBreakdown.ingredientsCost + costBreakdown.laborCost) /
      Math.max(1, pricing.servings);
    const ingredientForYield = servingCost * targetYield;
    const laborEstimate = ingredientForYield * 0.5;
    return ingredientForYield + laborEstimate + costBreakdown.deliveryCost;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Advanced Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="matrix">Pricing Matrix</TabsTrigger>
            <TabsTrigger value="custom">Custom Rates</TabsTrigger>
          </TabsList>

          {/* Cost Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4 mt-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <label>Ingredients & Supplies</label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    ${costBreakdown.ingredientsCost.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    value={costBreakdown.ingredientsCost}
                    onChange={(e) =>
                      handleCostChange(
                        "ingredientsCost",
                        Number(e.target.value),
                      )
                    }
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <label>Labor & Assembly</label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    ${costBreakdown.laborCost.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    value={costBreakdown.laborCost}
                    onChange={(e) =>
                      handleCostChange("laborCost", Number(e.target.value))
                    }
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <label>Delivery & Setup</label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    ${costBreakdown.deliveryCost.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    value={costBreakdown.deliveryCost}
                    onChange={(e) =>
                      handleCostChange("deliveryCost", Number(e.target.value))
                    }
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <label>Equipment & Rental</label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    ${costBreakdown.equipmentCost.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    value={costBreakdown.equipmentCost}
                    onChange={(e) =>
                      handleCostChange("equipmentCost", Number(e.target.value))
                    }
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="border-t pt-2 flex justify-between items-center p-3 bg-primary/10 rounded font-semibold">
                <label>Total Cost</label>
                <span>
                  $
                  {(
                    costBreakdown.ingredientsCost +
                    costBreakdown.laborCost +
                    costBreakdown.deliveryCost +
                    costBreakdown.equipmentCost
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded font-semibold text-green-900">
                <label>Profit Margin</label>
                <div className="flex items-center gap-2">
                  <span>${costBreakdown.markup.toFixed(2)}</span>
                  <input
                    type="number"
                    value={costBreakdown.markup}
                    onChange={(e) =>
                      handleCostChange("markup", Number(e.target.value))
                    }
                    className="w-20 px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded font-bold text-blue-900 text-lg">
                <label>FINAL PRICE</label>
                <span>${costBreakdown.finalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              Cost per serving: $
              {(
                (costBreakdown.ingredientsCost + costBreakdown.laborCost) /
                Math.max(1, pricing.servings)
              ).toFixed(2)}
            </div>
          </TabsContent>

          {/* Pricing Matrix Tab */}
          <TabsContent value="matrix" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Price by Serving Size</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[25, 50, 75, 100, 150, 200].map((servings) => (
                  <div
                    key={servings}
                    className="p-2 border rounded flex justify-between items-center"
                  >
                    <span>{servings} servings:</span>
                    <span className="font-semibold">
                      ${calculateByYieldGoal(servings).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h4 className="font-semibold text-sm">Complexity Surcharge</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>Simple design (+0%)</span>
                  <span>${costBreakdown.finalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>Moderate complexity (+15%)</span>
                  <span>${(costBreakdown.finalPrice * 1.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>High complexity (+30%)</span>
                  <span>${(costBreakdown.finalPrice * 1.3).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>Extremely intricate (+50%)</span>
                  <span>${(costBreakdown.finalPrice * 1.5).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Custom Rates Tab */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Base Price per Serving (USD)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={customPricing.basePerServing}
                  onChange={(e) =>
                    setCustomPricing({
                      ...customPricing,
                      basePerServing: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Decoration Fee per Item (USD)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={customPricing.decorationRate}
                  onChange={(e) =>
                    setCustomPricing({
                      ...customPricing,
                      decorationRate: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Per-Tier Complexity Fee (USD)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={customPricing.tierComplexity}
                  onChange={(e) =>
                    setCustomPricing({
                      ...customPricing,
                      tierComplexity: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <Button className="w-full">Save Custom Rates</Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
