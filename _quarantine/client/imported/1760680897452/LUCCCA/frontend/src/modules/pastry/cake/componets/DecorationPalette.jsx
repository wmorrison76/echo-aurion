// src/modules/pastry/cake/components/DecorationPalette.jsx
import React from "react";
import { Card } from "@/components/ui/card";

const decorations = [
  "Gold Leaf",
  "Fresh Flowers",
  "Macaron Topper",
  "Chocolate Drip",
  "Buttercream Swirls",
  "Edible Print",
];

export const DecorationPalette = ({ onDecorate }) => {
  return (
    <Card className="mt-4 p-3 border border-slate-300">
      <div className="font-semibold text-sm mb-2">Decoration Palette</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {decorations.map((item) => (
          <div
            key={item}
            onClick={() => onDecorate(item)}
            className="p-2 bg-slate-100 hover:bg-emerald-100 border rounded text-center cursor-pointer"
          >
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DecorationPalette;
