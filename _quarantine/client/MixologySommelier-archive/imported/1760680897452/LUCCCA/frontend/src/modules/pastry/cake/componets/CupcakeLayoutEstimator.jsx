// src/modules/pastry/cake/components/CupcakeLayoutEstimator.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const CupcakeLayoutEstimator = ({ onEstimate }) => {
  const [traySize, setTraySize] = useState("full");
  const [layoutType, setLayoutType] = useState("spell");
  const [wordOrNumber, setWordOrNumber] = useState("16");
  const [cupcakeSize, setCupcakeSize] = useState("standard");

  const getEstimate = () => {
    const baseTrayArea = traySize === "full" ? 18 * 26 : 13 * 18; // inches
    const cupcakeDiameter = cupcakeSize === "mini" ? 1.75 : 2.5;
    const cupcakeArea = Math.PI * Math.pow(cupcakeDiameter / 2, 2);

    const maxCupcakes = Math.floor((baseTrayArea * 0.75) / cupcakeArea); // Allow space between

    let shapeCupcakes = 0;

    if (layoutType === "spell") {
      const clean = wordOrNumber.replace(/\s+/g, "");
      shapeCupcakes = clean.length * 7; // Estimate 7 per letter/number
    }

    const fillerCupcakes = Math.max(0, maxCupcakes - shapeCupcakes);

    onEstimate({
      traySize,
      layoutType,
      shape: wordOrNumber,
      shapeCupcakes,
      fillerCupcakes,
      totalCupcakes: shapeCupcakes + fillerCupcakes,
    });
  };

  return (
    <Card className="p-4 space-y-4 border border-fuchsia-500 bg-fuchsia-50">
      <h3 className="text-sm font-semibold text-fuchsia-800">Cupcake Layout Estimator</h3>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Button
          variant={traySize === "full" ? "default" : "outline"}
          onClick={() => setTraySize("full")}
        >
          Full Sheet
        </Button>
        <Button
          variant={traySize === "half" ? "default" : "outline"}
          onClick={() => setTraySize("half")}
        >
          Half Sheet
        </Button>
      </div>

      <Input
        placeholder="Spell Word / Number"
        value={wordOrNumber}
        onChange={(e) => setWordOrNumber(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Button
          variant={cupcakeSize === "standard" ? "default" : "outline"}
          onClick={() => setCupcakeSize("standard")}
        >
          Standard
        </Button>
        <Button
          variant={cupcakeSize === "mini" ? "default" : "outline"}
          onClick={() => setCupcakeSize("mini")}
        >
          Mini
        </Button>
      </div>

      <Button onClick={getEstimate}>Estimate Cupcakes</Button>
    </Card>
  );
};

export default CupcakeLayoutEstimator;
