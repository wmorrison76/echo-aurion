// File: FutureSalesPanel.jsx
import React from "react";
import { useFutureForecast } from "./useFutureForecast";

export default function FutureSalesPanel() {
  const { today, next7Days, next30Days, next12Months } = useFutureForecast();

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">📈 Future Sales Forecast</h2>
      <div className="space-y-2">
        <div>Tomorrow: ${today.toFixed(2)}</div>
        <div>Next 7 Days: ${next7Days.toFixed(2)}</div>
        <div>Next 30 Days: ${next30Days.toFixed(2)}</div>
        <div>Next 12 Months: ${next12Months.toFixed(2)}</div>
      </div>
    </div>
  );
}