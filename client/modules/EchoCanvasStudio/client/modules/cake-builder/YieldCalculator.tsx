import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TierSpec } from "./types";
import { servingsForRound, estimateServings, recommendTiers } from "./logic";

interface YieldCalculatorProps {
  currentTiers: TierSpec[];
  currentShape: "round" | "square" | "sheet";
  guestCount: number;
  onTiersUpdate: (tiers: TierSpec[]) => void;
}

export default function YieldCalculator({
  currentTiers,
  currentShape,
  guestCount,
  onTiersUpdate,
}: YieldCalculatorProps) {
  const [targetGuests, setTargetGuests] = useState(guestCount);
  const [servingsPerPerson, setServingsPerPerson] = useState(1);
  const [bufferPercentage, setBufferPercentage] = useState(10);

  const currentServings = useMemo(() => {
    return estimateServings(currentTiers, currentShape);
  }, [currentTiers, currentShape]);

  const targetServings = useMemo(() => {
    return Math.ceil(
      targetGuests * servingsPerPerson * (1 + bufferPercentage / 100),
    );
  }, [targetGuests, servingsPerPerson, bufferPercentage]);

  const shortfall = targetServings - currentServings;
  const hasShortfall = shortfall > 0;

  const recommendedTiers = useMemo(() => {
    return recommendTiers(targetGuests);
  }, [targetGuests]);

  const recommendedServings = useMemo(() => {
    return estimateServings(recommendedTiers, currentShape);
  }, [recommendedTiers, currentShape]);

  const handleApplyRecommendation = () => {
    onTiersUpdate(recommendedTiers);
  };

  const scalingFactors = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5];

  const handleScaleTiers = (factor: number) => {
    const scaled = currentTiers.map((tier) => ({
      ...tier,
      diameter: tier.diameter ? tier.diameter * factor : undefined,
      width: tier.width ? tier.width * factor : undefined,
      depth: tier.depth ? tier.depth * factor : undefined,
    }));
    onTiersUpdate(scaled);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Yield Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guest & Serving Inputs */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-2">Guests</label>
            <Input
              type="number"
              min="1"
              value={targetGuests}
              onChange={(e) => setTargetGuests(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">
              Per Person
            </label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={servingsPerPerson}
              onChange={(e) => setServingsPerPerson(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">Buffer %</label>
            <Input
              type="number"
              min="0"
              max="50"
              value={bufferPercentage}
              onChange={(e) => setBufferPercentage(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Current vs Target */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted rounded">
            <div className="text-xs text-muted-foreground">
              Current Servings
            </div>
            <div className="text-2xl font-bold">{currentServings}</div>
            <div className="text-xs mt-1">
              From {currentTiers.length} tier(s)
            </div>
          </div>
          <div
            className={`p-3 rounded ${hasShortfall ? "bg-red-50" : "bg-green-50"}`}
          >
            <div
              className={`text-xs ${hasShortfall ? "text-red-600" : "text-green-600"}`}
            >
              Target Servings
            </div>
            <div
              className={`text-2xl font-bold ${hasShortfall ? "text-red-700" : "text-green-700"}`}
            >
              {targetServings}
            </div>
            {hasShortfall && (
              <div className="text-xs text-red-600 mt-1">
                Short by {shortfall} servings
              </div>
            )}
          </div>
        </div>

        {/* Recommendation */}
        {hasShortfall && (
          <div className="bg-orange-50 border border-orange-200 p-3 rounded space-y-2">
            <h4 className="font-semibold text-orange-900 text-sm">
              Recommended Tier Configuration
            </h4>
            <div className="text-sm">
              {recommendedTiers.map((tier, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    Tier {idx + 1}: {tier.diameter}
                    {currentShape === "round" && '"'} diameter
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {servingsForRound(tier.diameter || 0)} servings
                  </span>
                </div>
              ))}
            </div>
            <div className="text-sm font-semibold text-orange-900">
              Total: {recommendedServings} servings
            </div>
            <Button
              onClick={handleApplyRecommendation}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              Apply Recommended Tiers
            </Button>
          </div>
        )}

        {/* Quick Scale Options */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Quick Scale</h4>
          <div className="grid grid-cols-3 gap-2">
            {scalingFactors.map((factor) => (
              <Button
                key={factor}
                onClick={() => handleScaleTiers(factor)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {(factor * 100).toFixed(0)}%
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Scales all tier dimensions proportionally
          </div>
        </div>

        {/* Yield Reference */}
        <div className="bg-muted p-3 rounded text-xs space-y-1">
          <h4 className="font-semibold mb-2">Standard Yield Reference</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>6" round cake:</span>
              <span className="font-semibold">~18 servings</span>
            </div>
            <div className="flex justify-between">
              <span>8" round cake:</span>
              <span className="font-semibold">~32 servings</span>
            </div>
            <div className="flex justify-between">
              <span>10" round cake:</span>
              <span className="font-semibold">~50 servings</span>
            </div>
            <div className="flex justify-between">
              <span>12" round cake:</span>
              <span className="font-semibold">~72 servings</span>
            </div>
            <div className="flex justify-between">
              <span>9x13 sheet cake:</span>
              <span className="font-semibold">~22 servings</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
