// src/modules/admin/CakeAdminDashboard.jsx

import React from "react";
import { AdminDataEditorPanel } from "./data/AdminDataEditorPanel";
import { AddOnPricingControl } from "./data/AddOnPricingControl";
import { CakeStandUploader } from "../pastry/cake/components/CakeStandUploader";

export const CakeAdminDashboard = () => {
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-bold text-slate-800">🎂 Cake Admin Dashboard</h2>
      <AdminDataEditorPanel />
      <AddOnPricingControl />
      <CakeStandUploader />
      {/* Future blocks: Season control, flower vendor integrations, AI preset templates */}
    </div>
  );
};

export default CakeAdminDashboard;
