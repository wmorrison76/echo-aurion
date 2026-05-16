/**
 * Sparkline
 * --------------
 * Minimal SVG sparkline (no external deps) for revenue-at-risk trend.
 */
import React from "react";

interface Props {
  points: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
}

export default function Sparkline({
  points,
  width = 120,
  height = 28,
  strokeColor = "#c8a97e",
  fillColor = "rgba(200, 169, 126, 0.15)",
}: Props) {
  if (!points || points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  });

  const path = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const fillPath = `${path} L${width},${height} L0,${height} Z`;

  const lastY = coords[coords.length - 1][1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
      data-testid="sparkline"
    >
      <path d={fillPath} fill={fillColor} />
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="2" fill={strokeColor} />
    </svg>
  );
}
