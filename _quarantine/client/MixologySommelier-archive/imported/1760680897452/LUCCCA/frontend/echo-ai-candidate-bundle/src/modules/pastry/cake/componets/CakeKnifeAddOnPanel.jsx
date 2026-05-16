// src/modules/pastry/cake/components/CakeKnifeAddOnPanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const CakeKnifeAddOnPanel = ({ onAdd }) => {
  const [knifeIncluded, setKnifeIncluded] = useState(false);
  const [serverIncluded, setServerIncluded] = useState(false);
  const [total, setTotal] = useState(0);

  const updateTotal = () => {
    const base = (knifeIncluded ? 10 : 0) + (serverIncluded ? 15 : 0);
    setTotal(base);
    onAdd({
      knife: knifeIncluded,
      server: serverIncluded,
      price: base,
    });
  };

  return (
    <Card className="p-4 space-y-3 border border-rose-500 bg-rose-50">
      <h3 className="text-sm font-semibold text-rose-700">Cake Knife & Server Add-On</h3>

      <label className="text-xs block">
        <input type="checkbox" checked={knifeIncluded} onChange={() => setKnifeIncluded(!knifeIncluded)} />
        &nbsp; Include Cake Knife ($10)
      </label>

      <label className="text-xs block">
        <input type="checkbox" checked={serverIncluded} onChange={() => setServerIncluded(!serverIncluded)} />
        &nbsp; Include Cake Server ($15)
      </label>

      <div className="text-xs text-gray-700 mt-2">
        <strong>Total Add-On:</strong> ${total}
      </div>

      <button
        onClick={updateTotal}
        className="px-3 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700"
      >
        Apply to Invoice
      </button>
    </Card>
  );
};
