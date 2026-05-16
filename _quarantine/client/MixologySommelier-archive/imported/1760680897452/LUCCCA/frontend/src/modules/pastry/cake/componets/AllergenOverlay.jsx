// src/modules/pastry/cake/components/AllergenOverlay.jsx
import React from "react";

const allergenMap = {
  nuts: "🌰",
  dairy: "🥛",
  gluten: "🌾",
  soy: "🫘",
  eggs: "🥚",
};

export const AllergenOverlay = ({ layers }) => {
  const detected = new Set();

  layers.forEach((layer) => {
    const note = `${layer.flavor} ${layer.filling} ${layer.notes}`.toLowerCase();
    if (note.includes("almond") || note.includes("hazelnut") || note.includes("nut")) detected.add("nuts");
    if (note.includes("milk") || note.includes("cream") || note.includes("cheese")) detected.add("dairy");
    if (note.includes("flour") || note.includes("wheat")) detected.add("gluten");
    if (note.includes("soy")) detected.add("soy");
    if (note.includes("egg")) detected.add("eggs");
  });

  if (detected.size === 0) return null;

  return (
    <div className="absolute top-2 right-2 z-50 text-xs font-medium bg-red-50 border border-red-300 px-2 py-1 rounded text-red-700 shadow-sm">
      Allergens:
      {[...detected].map((item) => (
        <span key={item} className="ml-2">
          {allergenMap[item]} {item}
        </span>
      ))}
    </div>
  );
};

export default AllergenOverlay;
