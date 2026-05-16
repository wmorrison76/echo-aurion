// CanvasRuler.jsx
// Renders horizontal and vertical rulers for the canvas

import React from "react";

export default function CanvasRuler({ orientation = "horizontal", length = 1000 }) {
  const ticks = Array.from({ length: length / 10 }, (_, i) => i * 10);

  return (
    <div className={`ruler ruler-${orientation}`}>
      {ticks.map((tick) => (
        <div key={tick} className="ruler-tick" style={{
          [orientation === "horizontal" ? "left" : "top"]: `${tick}px`
        }}>
          <span className="ruler-label">{tick}</span>
        </div>
      ))}
    </div>
  );
}