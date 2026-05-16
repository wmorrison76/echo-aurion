// GradientSelector.jsx
import React from "react";

const gradientOptions = [
  { name: "Sunset", value: "from-orange-400 via-pink-500 to-purple-600" },
  { name: "Ocean", value: "from-blue-500 via-cyan-400 to-teal-500" },
  { name: "Aurora", value: "from-green-400 via-teal-300 to-blue-500" },
  { name: "Ash", value: "from-gray-500 via-gray-400 to-gray-300" },
];

const GradientSelector = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {gradientOptions.map((gradient) => (
        <button
          key={gradient.name}
          className={`h-16 rounded-lg shadow-md bg-gradient-to-br ${gradient.value}`}
          onClick={() => onSelect(gradient.value)}
          title={gradient.name}
        />
      ))}
    </div>
  );
};

export default GradientSelector;
