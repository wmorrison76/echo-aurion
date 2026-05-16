// src/modules/calendar/components/TVCalendarView.jsx
import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export const TVCalendarView = ({ orders }) => {
  const [range, setRange] = useState("3days");

  const filterOrders = () => {
    const today = new Date();
    const future = new Date(today);
    if (range === "3days") future.setDate(today.getDate() + 3);
    else if (range === "week") future.setDate(today.getDate() + 7);
    else future.setMonth(today.getMonth() + 1);

    return orders.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= today && orderDate <= future;
    });
  };

  return (
    <div className="bg-black text-white p-6">
      <div className="text-xl mb-4">Upcoming Cake Orders</div>
      <div className="flex gap-4 mb-4">
        {["3days", "week", "month"].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded ${range === r ? "bg-emerald-500" : "bg-gray-700"}`}
          >
            {r === "3days" ? "Next 3 Days" : r === "week" ? "This Week" : "Month"}
          </button>
        ))}
      </div>
      <ul className="text-lg space-y-2 max-h-[65vh] overflow-y-auto">
        {filterOrders().map((order) => (
          <li key={order.id} className="border-b border-gray-600 pb-2">
            <strong>{order.client.name}</strong> – {format(new Date(order.date), "MMM d, h:mm a")}
            <br />
            <span className="text-sm text-gray-400">{order.cakeName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TVCalendarView;
