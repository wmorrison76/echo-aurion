// File: src/components/EchoCore/components/financial/KPIBarChart.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// [TEAM LOG: Finance] - Bar chart for KPI trends
export default function KPIBarChart({ data }) {
  return (
    <div className="w-full h-64 bg-white rounded-xl shadow-sm p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
