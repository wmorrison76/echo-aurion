// File: src/components/EchoCore/components/interaction/EchoStepper.jsx

import React from "react";

const EchoStepper = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center space-x-4">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              idx <= currentStep ? "bg-cyan-600 text-white" : "bg-gray-300 text-gray-800"
            }`}
          >
            {idx + 1}
          </div>
          {idx < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-400 mx-2"></div>}
        </div>
      ))}
    </div>
  );
};

export default EchoStepper;
