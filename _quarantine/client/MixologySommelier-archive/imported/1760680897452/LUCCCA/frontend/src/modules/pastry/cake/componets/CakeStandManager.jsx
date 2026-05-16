// src/modules/pastry/cake/components/CakeStandManager.jsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Fuse from "fuse.js";
import { defaultStandLibrary } from "../data/standLibrary";

export const CakeStandManager = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [customUpload, setCustomUpload] = useState(null);
  const [rentalFee, setRentalFee] = useState(0);

  const fuse = new Fuse(defaultStandLibrary, {
    keys: ["name", "style", "material"],
    threshold: 0.4,
  });

  const results = query
    ? fuse.search(query).map((r) => r.item).slice(0, 6)
    : defaultStandLibrary.slice(0, 6);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCustomUpload(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const applyStand = (standData) => {
    onSelect({
      ...standData,
      rentalFee,
      isCustom: !!customUpload,
      imageURL: customUpload || standData.image,
    });
  };

  return (
    <Card className="p-4 space-y-4 border border-violet-500 bg-violet-50">
      <h3 className="text-sm font-semibold text-violet-700">Cake Stand Manager</h3>

      <Input
        placeholder="Search stand by name, style, or material"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="text-xs">Rental Fee ($):</div>
      <Input
        type="number"
        value={rentalFee}
        onChange={(e) => setRentalFee(Number(e.target.value))}
      />

      <div className="text-xs font-medium mt-2">Upload Custom Stand (3/4 View)</div>
      <Input type="file" accept="image/*" onChange={handleUpload} />

      {results.length > 0 && (
        <ul className="space-y-1 text-xs">
          {results.map((stand) => (
            <li
              key={stand.id}
              onClick={() => applyStand(stand)}
              className="cursor-pointer hover:bg-violet-100 px-2 py-1 rounded"
            >
              <strong>{stand.name}</strong> — {stand.material} / {stand.style}
            </li>
          ))}
        </ul>
      )}

      {customUpload && (
        <div className="mt-2 text-xs italic text-slate-600">Custom image uploaded ✅</div>
      )}
    </Card>
  );
};

export default CakeStandManager;
