import React from "react";

interface Props {
  points: number[];
  stroke?: string;
  height?: number;
}

export function MetricSparkline({
  points,
  stroke = "currentColor",
  height = 32,
}: Props) {
  if (!points.length) {
    return <div className="text-xs text-muted-foreground">No data</div>;
  }

  const width = Math.max(points.length * 4, 80);
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);

  const path = points
    .map((val, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
