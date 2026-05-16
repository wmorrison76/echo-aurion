// src/modules/pastry/cake/components/CakeCuttingDiagramGenerator.jsx

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CakeCuttingDiagramGenerator = ({ shape = "round", diameter = 10, servings = 28, onExport }) => {
  const generateDiagram = () => {
    const cuts = [];
    const sliceWidth = shape === "round" ? 1 : 2;
    const rows = shape === "round" ? Math.ceil(diameter / 2) : Math.ceil(servings / 8);
    const columns = Math.ceil(servings / rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        cuts.push(`Row ${r + 1}, Slice ${c + 1}`);
      }
    }

    const imagePlaceholder = `/diagrams/${shape}_cutting_guide.png`; // Replace with dynamic SVG or canvas in future

    const result = {
      shape,
      diameter,
      servings,
      visual: imagePlaceholder,
      instructions: cuts,
    };

    if (onExport) onExport(result);
  };

  return (
    <Card className="p-4 space-y-3 border border-yellow-500 bg-yellow-50">
      <h3 className="text-sm font-semibold text-yellow-700">Cake Cutting Diagram</h3>

      <div className="text-xs text-gray-600">
        Shape: <strong>{shape}</strong> | Diameter: <strong>{diameter}"</strong> | Servings: <strong>{servings}</strong>
      </div>

      <Button onClick={generateDiagram}>Generate Cutting Guide</Button>
    </Card>
  );
};

export default CakeCuttingDiagramGenerator;
