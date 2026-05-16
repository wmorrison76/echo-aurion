// File: src/components/EchoCore/components/financial/RevenueSummaryCard.jsx
import React from "react";

// [TEAM LOG: Finance] - Revenue snapshot with KPI highlights
export default function RevenueSummaryCard({ revenue, target }) {
  const percent = target ? ((revenue / target) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white p-4 rounded-xl shadow-md flex flex-col gap-2">
      <h3 className="text-lg font-semibold">Revenue Summary</h3>
      <p className="text-2xl font-bold">${revenue.toLocaleString()}</p>
      <p className="text-sm text-gray-500">
        {target ? `Target: $${target.toLocaleString()} (${percent}%)` : "No target set"}
      </p>
    </div>
  );
}
