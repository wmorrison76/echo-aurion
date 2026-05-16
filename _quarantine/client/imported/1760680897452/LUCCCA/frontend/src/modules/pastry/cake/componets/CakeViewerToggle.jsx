// src/modules/pastry/cake/components/CakeViewerToggle.jsx
import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";

export const CakeViewerToggle = ({ chefView, setChefView }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm text-slate-700">Toggle View</span>
      <Switch checked={chefView} onCheckedChange={setChefView} />
      <span className="text-sm text-slate-700">{chefView ? "Chef View" : "Client View"}</span>
    </div>
  );
};

export default CakeViewerToggle;
