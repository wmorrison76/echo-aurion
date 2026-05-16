// src/modules/pastry/cake/components/Cake360Viewer.jsx

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

export const Cake360Viewer = ({ children, height = 400 }) => {
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState(0);

  const handleDrag = (event, info) => {
    const deltaX = info.delta.x;
    setRotation((prev) => prev + deltaX * 0.5);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        perspective: 1200,
        height: `${height}px`,
      }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleDrag}
        className="absolute top-0 left-1/2 transform -translate-x-1/2"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotation}deg)`,
        }}
      >
        <div
          className="w-[300px] h-[400px] transform-style-3d"
          style={{
            transform: "translateZ(50px)",
          }}
        >
          {children}
        </div>
      </motion.div>

      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
        Drag to rotate
      </div>
    </div>
  );
};

export default Cake360Viewer;
