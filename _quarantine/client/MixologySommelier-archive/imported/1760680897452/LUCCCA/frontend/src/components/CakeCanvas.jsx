import React, { useRef, useEffect } from "react";

export default function CakeCanvas({ designData = {} }) {
  const { color = "#f7e1d7" } = designData;
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);

    // simple 2-tier illustration
    ctx.fillStyle = "#d9a5b3";
    ctx.fillRect(60, 60, 180, 90);
    ctx.fillStyle = "#b88ea3";
    ctx.fillRect(60, 140, 180, 90);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, 180, 170);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={260}
      className="border rounded-lg shadow bg-white max-w-full h-auto"
    />
  );
}
