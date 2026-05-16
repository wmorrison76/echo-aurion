// src/modules/pastry/cake/components/WireframeLoader.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const wireframeShapes = [
  { id: "standard-tier", name: "Standard Tiered Cake" },
  { id: "mad-hatter", name: "Mad Hatter (Tilted Staggered)" },
  { id: "cupcake-stack", name: "Cupcake Stack Base" },
  { id: "spiral", name: "Spiral Climb Display" },
  { id: "puzzle-shape", name: "Puzzle Cut Base" },
  { id: "freestyle", name: "Freestyle Build (Blank)" },
];

export const WireframeLoader = ({ onSelect }) => {
  const [active, setActive] = useState(null);

  return (
    <Card className="p-4 mb-4 border border-slate-300 bg-slate-50">
      <h3 className="text-sm font-semibold mb-2 text-slate-700">Start with a Shape</h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {wireframeShapes.map((shape) => (
          <Button
            key={shape.id}
            variant={active === shape.id ? "default" : "outline"}
            onClick={() => {
              setActive(shape.id);
              onSelect(shape.id);
            }}
          >
            {shape.name}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default WireframeLoader;
