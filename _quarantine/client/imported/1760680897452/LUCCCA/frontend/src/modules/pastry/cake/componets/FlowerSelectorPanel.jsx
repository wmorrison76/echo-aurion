// src/modules/pastry/cake/components/FlowerSelectorPanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { flowerLibrary } from "../data/flowerLibrary";

export const FlowerSelectorPanel = ({ onSelect }) => {
  const [region, setRegion] = useState("Florida");
  const [season, setSeason] = useState("Spring");

  const filtered = flowerLibrary.filter(
    (f) => f.regions.includes(region) && f.seasons.includes(season)
  );

  return (
    <Card className="p-4 space-y-3 border border-purple-400 bg-purple-50">
      <h3 className="text-sm font-semibold text-purple-700">Fresh Flower Selector</h3>

      <Input
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        placeholder="Region (e.g. Florida, Northeast, PNW)"
      />

      <Input
        value={season}
        onChange={(e) => setSeason(e.target.value)}
        placeholder="Season (e.g. Spring, Summer, Fall)"
      />

      <ul className="text-xs space-y-1 mt-2">
        {filtered.map((flower) => (
          <li
            key={flower.name}
            className="cursor-pointer hover:bg-purple-100 px-2 py-1 rounded"
            onClick={() => onSelect(flower)}
          >
            🌸 <strong>{flower.name}</strong> {flower.edible ? "(Edible)" : "(Decoration Only)"}
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default FlowerSelectorPanel;
