// src/modules/pastry/cake/components/CupcakeTowerBuilder.jsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CupcakeTowerBuilder = ({ onUpdate }) => {
  const [levels, setLevels] = useState([
    { id: 1, count: 6, flavor: "", decor: "" },
    { id: 2, count: 8, flavor: "", decor: "" },
  ]);

  const updateLevel = (index, field, value) => {
    const updated = [...levels];
    updated[index][field] = value;
    setLevels(updated);
    onUpdate(updated);
  };

  const addLevel = () => {
    setLevels([
      ...levels,
      {
        id: levels.length + 1,
        count: 6,
        flavor: "",
        decor: "",
      },
    ]);
  };

  const removeLevel = (index) => {
    const updated = levels.filter((_, i) => i !== index);
    setLevels(updated);
    onUpdate(updated);
  };

  return (
    <Card className="p-4 space-y-4 border border-slate-300 bg-slate-50">
      <div className="text-sm font-semibold">Cupcake Tower Builder</div>

      {levels.map((level, index) => (
        <div
          key={level.id}
          className="grid grid-cols-4 gap-2 items-center text-xs"
        >
          <Input
            type="number"
            min={1}
            value={level.count}
            onChange={(e) => updateLevel(index, "count", e.target.value)}
            placeholder="Qty"
          />
          <Input
            value={level.flavor}
            onChange={(e) => updateLevel(index, "flavor", e.target.value)}
            placeholder="Flavor"
          />
          <Input
            value={level.decor}
            onChange={(e) => updateLevel(index, "decor", e.target.value)}
            placeholder="Decoration"
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500"
            onClick={() => removeLevel(index)}
          >
            ✕
          </Button>
        </div>
      ))}

      <Button onClick={addLevel} size="sm" variant="outline">
        + Add Level
      </Button>
    </Card>
  );
};

export default CupcakeTowerBuilder;
