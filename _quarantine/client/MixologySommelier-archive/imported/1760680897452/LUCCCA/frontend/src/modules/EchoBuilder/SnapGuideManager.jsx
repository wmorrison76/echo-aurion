// SnapGuideManager.jsx
// Handles dynamic snap lines during drag and drop operations

import React from "react";

export default function SnapGuideManager({ guides }) {
  return (
    <div className="snap-guides">
      {guides.map((guide, index) => (
        <div
          key={index}
          className={`snap-line ${guide.orientation}`}
          style={{
            left: guide.orientation === "vertical" ? guide.position : undefined,
            top: guide.orientation === "horizontal" ? guide.position : undefined
          }}
        />
      ))}
    </div>
  );
}