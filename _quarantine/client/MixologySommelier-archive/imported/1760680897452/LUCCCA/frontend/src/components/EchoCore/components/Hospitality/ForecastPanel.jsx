// File: src/components/EchoCore/components/hospitality/ForecastPanel.jsx
import React from "react";

// [TEAM LOG: Hospitality] - Occupancy and covers forecast
export default function ForecastPanel({ forecast }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-2">Occupancy Forecast</h3>
      <ul className="space-y-1 text-sm text-gray-600">
        {forecast.map((day) => (
          <li key={day.date} className="flex justify-between">
            <span>{day.date}</span>
            <span>{day.occupancy}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
