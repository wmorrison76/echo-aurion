// src/modules/pastry/cake/components/CakeDeliveryOptionsPanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const CakeDeliveryOptionsPanel = ({ onSet }) => {
  const [deliveryType, setDeliveryType] = useState("pickup");
  const [miles, setMiles] = useState(0);
  const [setupFee, setSetupFee] = useState(0);

  const DELIVERY_RATE_PER_MILE = 2.25;

  const calculateCharges = () => {
    const deliveryCharge =
      deliveryType === "delivery" ? miles * DELIVERY_RATE_PER_MILE : 0;

    const total = deliveryCharge + setupFee;

    onSet({
      deliveryType,
      miles,
      deliveryCharge,
      setupFee,
      total,
    });
  };

  return (
    <Card className="p-4 space-y-3 border border-teal-500 bg-teal-50">
      <h3 className="text-sm font-semibold text-teal-700">Pickup / Delivery Options</h3>

      <div className="flex flex-col text-xs gap-2">
        <label>
          <input
            type="radio"
            checked={deliveryType === "pickup"}
            onChange={() => setDeliveryType("pickup")}
          />
          &nbsp; Free Pickup (Chef's Kitchen)
        </label>

        <label>
          <input
            type="radio"
            checked={deliveryType === "delivery"}
            onChange={() => setDeliveryType("delivery")}
          />
          &nbsp; Delivery Required
        </label>
      </div>

      {deliveryType === "delivery" && (
        <div className="text-xs space-y-2">
          <label>
            Distance to Delivery (miles):
            <Input
              type="number"
              min={0}
              value={miles}
              onChange={(e) => setMiles(Number(e.target.value))}
            />
          </label>

          <label>
            Setup Fee (optional):
            <Input
              type="number"
              min={0}
              value={setupFee}
              onChange={(e) => setSetupFee(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <button
        onClick={calculateCharges}
        className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
      >
        Apply to Invoice
      </button>
    </Card>
  );
};
