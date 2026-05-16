import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export interface ConsumablesEstimatorProps {
  seats?: number;
  buffets?: number;
}
export function ConsumablesEstimator({
  seats = 120,
  buffets = 2,
}: ConsumablesEstimatorProps) {
  const estimates = useMemo(
    () => ({
      napkins: Math.ceil(seats * 1.2),
      plates: Math.ceil(seats * 1.1),
      glasses: Math.ceil(seats * 1.5),
      chaferFuel: buffets * 4,
      heatLampBulbs: buffets * 2,
      centerpieces: Math.ceil(seats / 6),
    }),
    [seats, buffets],
  );
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Consumables Estimate</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-1">
        {" "}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {" "}
          <div className="flex justify-between">
            {" "}
            <span>Napkins:</span>{" "}
            <span className="font-semibold">{estimates.napkins}</span>{" "}
          </div>{" "}
          <div className="flex justify-between">
            {" "}
            <span>Plates:</span>{" "}
            <span className="font-semibold">{estimates.plates}</span>{" "}
          </div>{" "}
          <div className="flex justify-between">
            {" "}
            <span>Glasses:</span>{" "}
            <span className="font-semibold">{estimates.glasses}</span>{" "}
          </div>{" "}
          <div className="flex justify-between">
            {" "}
            <span>Chafer Fuel:</span>{" "}
            <span className="font-semibold">{estimates.chaferFuel}</span>{" "}
          </div>{" "}
          <div className="flex justify-between">
            {" "}
            <span>Heat Lamps:</span>{" "}
            <span className="font-semibold">
              {estimates.heatLampBulbs}
            </span>{" "}
          </div>{" "}
          <div className="flex justify-between">
            {" "}
            <span>Centerpieces:</span>{" "}
            <span className="font-semibold">{estimates.centerpieces}</span>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
