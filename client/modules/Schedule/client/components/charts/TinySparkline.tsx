import React from "react";

export interface TinySparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export default function TinySparkline({
  data,
  width = 64,
  height = 24,
  className,
}: TinySparklineProps) {
  if (!data.length) return <span className={className} aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = width - 2;
  const h = height - 2;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w + 1;
      const y = h + 1 - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}
