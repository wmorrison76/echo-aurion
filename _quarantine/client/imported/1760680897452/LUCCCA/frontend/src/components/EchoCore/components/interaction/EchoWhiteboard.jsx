// File: src/components/EchoCore/components/interaction/EchoWhiteboard.jsx
import React from "react";
import DraggableModuleContainer from "./DraggableModuleContainer";
import useWhiteboardLayout from "../../hooks/useWhiteboardLayout";
import { RevenueSummaryCard, DashboardKPIs } from "../financial";
import { ForecastPanel } from "../hospitality";

// [TEAM LOG: Whiteboard] - Drag/drop dashboard modules
export default function EchoWhiteboard() {
  const defaultModules = [
    { id: "rev-card", content: <RevenueSummaryCard revenue={12500} target={20000} /> },
    { id: "kpi-card", content: <DashboardKPIs metrics={[{ label: "Sales", value: "$15k" }]} /> },
    { id: "forecast", content: <ForecastPanel forecast={[{ date: "Mon", occupancy: 75 }]} /> },
  ];

  const [modules, setModules] = useWhiteboardLayout(defaultModules);

  return (
    <div className="bg-gray-50 p-4 rounded-xl shadow-inner min-h-[300px]">
      <h2 className="text-xl font-bold mb-3">Echo Whiteboard</h2>
      <DraggableModuleContainer modules={modules} setModules={setModules} />
    </div>
  );
}
