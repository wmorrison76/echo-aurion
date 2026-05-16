import React from "react";
export type HeatItem = {
  id: string;
  x: number; // feet y: number; // feet width: number; // feet seats?: number;
};
function ftToPx(ft: number, PX_PER_FT: number) {
  return ft * PX_PER_FT;
}
export default function HeatmapOverlay({
  items,
  pxPerFt = 12,
  intensity = 0.06,
}: {
  items: HeatItem[];
  pxPerFt?: number;
  intensity?: number;
}) {
  const blobs = items
    .filter((i) => (i.seats ?? 0) > 0)
    .map((i) => {
      const rFt = Math.max(i.width / 2, 2);
      const rPx = ftToPx(rFt, pxPerFt) * 1.6;
      const cx = ftToPx(i.x, pxPerFt);
      const cy = ftToPx(i.y, pxPerFt);
      const alpha = Math.min(0.65, intensity * (i.seats ?? 0));
      return { id: i.id, cx, cy, rPx, alpha };
    });
  const filterId = React.useId();
  return (
    <g style={{ mixBlendMode: "multiply" }}>
      {" "}
      <defs>
        {" "}
        <radialGradient id={`heat-grad-${filterId}`} cx="50%" cy="50%" r="50%">
          {" "}
          <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />{" "}
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />{" "}
        </radialGradient>{" "}
        <filter
          id={`heat-blur-${filterId}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          {" "}
          <feGaussianBlur stdDeviation="12" />{" "}
        </filter>{" "}
      </defs>{" "}
      {blobs.map((b) => (
        <circle
          key={b.id}
          cx={b.cx}
          cy={b.cy}
          r={b.rPx}
          fill={`url(#heat-grad-${filterId})`}
          filter={`url(#heat-blur-${filterId})`}
          opacity={b.alpha}
        />
      ))}{" "}
    </g>
  );
}
