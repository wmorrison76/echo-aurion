// File: src/components/LiquidWhiteBoard/LiquidWhiteBoardEngine.jsx

import React from "react";
import FutureSalesForecast from "@/components/EchoCore/panels/FutureSalesForecast"; // <- Adjust path if needed

const LiquidWhiteBoardEngine = () => {
  return (
    <div className="w-full h-full p-4 grid grid-cols-1 gap-4 overflow-auto">
      {/* 🌐 Whiteboard Wrapper: You can insert more panels below as needed */}
      
      <div className="rounded-2xl shadow-lg bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          📊 Future Sales Forecast
        </h2>
        <FutureSalesForecast />
      </div>

    </div>
  );
};

export default LiquidWhiteBoardEngine;
