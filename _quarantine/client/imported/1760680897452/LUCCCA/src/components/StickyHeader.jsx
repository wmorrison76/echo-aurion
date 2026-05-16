// src/components/StickyHeader.jsx
import React from "react";

const StickyHeader = ({ title }) => {
  return (
    <div className="sticky top-0 z-20 bg-white shadow-md px-6 py-4 border-b">
      <h1 className="text-2xl font-bold uppercase tracking-wider">{title}</h1>
    </div>
  );
};

export default StickyHeader;
