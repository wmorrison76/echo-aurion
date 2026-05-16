// GridOverlay.jsx
// Shows a grid overlay on the canvas to aid in alignment

import React from "react";

export default function GridOverlay({ spacing = 20, width = 1000, height = 800 }) {
  const linesX = Array.from({ length: Math.floor(width / spacing) }, (_, i) => i * spacing);
  const linesY = Array.from({ length: Math.floor(height / spacing) }, (_, i) => i * spacing);

  return (
    <svg className="grid-overlay" width={width} height={height}>
      {linesX.map((x) => (
        <line key={`x-${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#ccc" strokeWidth="0.5" />
      ))}
      {linesY.map((y) => (
        <line key={`y-${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#ccc" strokeWidth="0.5" />
      ))}
    </svg>
  );
}