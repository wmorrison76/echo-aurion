// src/components/ui/WhiskLoader.jsx

import React from "react";

export const WhiskLoader = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
    <img
      src="/assets/whisk-spin.svg"
      alt="Loading"
      className="w-6 h-6 animate-spin-slow"
    />
    <span>{message}</span>
  </div>
);
