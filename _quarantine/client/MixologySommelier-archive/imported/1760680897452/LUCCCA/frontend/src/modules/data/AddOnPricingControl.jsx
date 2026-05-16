// src/modules/admin/data/AddOnPricingControl.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const AddOnPricingControl = () => {
  const [addons, setAddons] = useState([
    { name: "Cake Stand Rental", price: "15.00", taxable: true, allowOverride: true },
    { name: "Delivery (base)", price: "10.00", taxable: true, allowOverride: false },
    { name: "Setup Fee (per cake)", price: "5.00", taxable: false, allowOverride: true },
    { name: "Cake Design Consultation", price: "30.00", taxable: false, allowOverride: true }
  ]);

  const handleChange = (index, key, value) => {
    const newAddons = [...addons];
    newAddons[index][key] = value;
    setAddons(newAddons);
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-bold text-slate-700">Add-On Pricing Controls</h3>
      {addons.map((item, idx) => (
        <div key={idx} className="grid grid-cols-4 items-center gap-2 text-sm">
          <span>{item.name}</span>
          <Input
            value={item.price}
            onChange={(e) => handleChange(idx, "price", e.target.value)}
            className="w-20"
          />
          <Switch
            checked={item.taxable}
            onCheckedChange={(val) => handleChange(idx, "taxable", val)}
          />
          <Switch
            checked={item.allowOverride}
            onCheckedChange={(val) => handleChange(idx, "allowOverride", val)}
          />
        </div>
      ))}
    </Card>
  );
};

export default AddOnPricingControl;
