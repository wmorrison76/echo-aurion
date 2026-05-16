// src/modules/pastry/cake/components/FreestyleCakeBuilder.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const FreestyleCakeBuilder = ({ onUpdate }) => {
  const [baseShape, setBaseShape] = useState("rectangle");
  const [cutInstructions, setCutInstructions] = useState("");
  const [servings, setServings] = useState(12);
  const [notes, setNotes] = useState("");

  const shapes = ["rectangle", "circle", "bundt", "rolled", "sculpted", "puzzle"];

  const handleExport = () => {
    onUpdate({
      type: "freestyle",
      baseShape,
      cutInstructions,
      servings,
      notes,
    });
  };

  return (
    <Card className="p-4 space-y-4 border border-amber-400 bg-amber-50">
      <h3 className="text-sm font-semibold text-amber-800">Freestyle & Carved Cake Builder</h3>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {shapes.map((shape) => (
          <Button
            key={shape}
            variant={baseShape === shape ? "default" : "outline"}
            onClick={() => setBaseShape(shape)}
          >
            {shape.charAt(0).toUpperCase() + shape.slice(1)}
          </Button>
        ))}
      </div>

      <Input
        type="number"
        min={1}
        value={servings}
        onChange={(e) => setServings(Number(e.target.value))}
        placeholder="Estimated Servings"
      />

      <Input
        value={cutInstructions}
        onChange={(e) => setCutInstructions(e.target.value)}
        placeholder="Cutting or Trimming Instructions"
      />

      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="General Notes"
      />

      <Button onClick={handleExport}>Save Freestyle Build</Button>
    </Card>
  );
};

export default FreestyleCakeBuilder;
