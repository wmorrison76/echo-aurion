// File: src/components/EchoCore/components/hospitality/GuestInsightsCard.jsx
import React from "react";

// [TEAM LOG: Hospitality] - VIP mentions and guest feedback
export default function GuestInsightsCard({ insights }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-2">Guest Insights</h3>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="text-sm text-gray-700">
            <span className="font-medium">{insight.guest}</span>: {insight.comment}
          </li>
        ))}
      </ul>
    </div>
  );
}
