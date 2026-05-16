// File: src/components/EchoCore/components/theme/GradientSelector.jsx
import React from "react";
import { useDashboardTheme } from "./DashboardThemeContext";

// [TEAM LOG: Theme] - UI to pick dashboard gradient
export default function GradientSelector() {
  const { gradient, updateGradient } = useDashboardTheme();

  const options = [
    "from-blue-500 to-purple-500",
    "from-green-400 to-teal-500",
    "from-pink-500 to-yellow-500",
  ];

  return (
    <div className="flex gap-2 p-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => updateGradient(opt)}
          className={`p-3 rounded-xl bg-gradient-to-r ${opt} ${gradient === opt ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
          aria-label={`Select ${opt}`}
        />
      ))}
    </div>
  );
}
