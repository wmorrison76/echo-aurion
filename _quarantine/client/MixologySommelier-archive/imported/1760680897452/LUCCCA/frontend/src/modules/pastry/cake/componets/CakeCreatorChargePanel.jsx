// src/modules/pastry/cake/components/CakeCreatorChargePanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const CakeCreatorChargePanel = ({ defaultAmount = 35, onSet }) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [label, setLabel] = useState("Custom Cake Design Enhancement");

  const handleSet = () => {
    onSet({
      amount,
      label,
      included: amount > 0,
    });
  };

  return (
    <Card className="p-4 space-y-3 border border-cyan-500 bg-cyan-50">
      <h3 className="text-sm font-semibold text-cyan-700">Cake Creator Charge</h3>

      <Input
        placeholder="Charge Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        className="w-32"
      />

      <div className="text-xs text-gray-600">
        Set to $0 to offer as complimentary. Typical range: $25–$45.
      </div>

      <button
        onClick={handleSet}
        className="px-3 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700"
      >
        Apply
      </button>
    </Card>
  );
};

export default CakeCreatorChargePanel;
