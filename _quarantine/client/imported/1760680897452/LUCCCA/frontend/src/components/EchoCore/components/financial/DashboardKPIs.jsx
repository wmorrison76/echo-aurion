// File: src/components/EchoCore/components/financial/DashboardKPIs.jsx
import React from "react";

// [TEAM LOG: Finance] - Aggregated financial KPIs
export default function DashboardKPIs({ metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((kpi) => (
        <div key={kpi.label} className="bg-white p-3 rounded-lg shadow-sm text-center">
          <p className="text-sm text-gray-600">{kpi.label}</p>
          <p className="text-xl font-bold">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
