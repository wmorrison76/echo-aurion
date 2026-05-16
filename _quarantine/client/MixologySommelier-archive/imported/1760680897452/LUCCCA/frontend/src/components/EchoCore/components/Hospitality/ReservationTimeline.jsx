// File: src/components/EchoCore/components/hospitality/ReservationTimeline.jsx
import React from "react";

// [TEAM LOG: Hospitality] - Visual booking timeline
export default function ReservationTimeline({ reservations }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-2">Reservation Timeline</h3>
      <div className="relative h-24 flex items-center gap-1 overflow-x-auto">
        {reservations.map((res) => (
          <div
            key={res.time}
            className={`flex-shrink-0 p-2 rounded-md text-xs ${
              res.status === "confirmed" ? "bg-green-200" : "bg-yellow-200"
            }`}
          >
            {res.time} - {res.name}
          </div>
        ))}
      </div>
    </div>
  );
}
