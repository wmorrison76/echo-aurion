import React from "react";
import { cn } from "@/lib/glass";
interface ResizeTooltipProps {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  mouseX?: number;
  mouseY?: number;
}
export const ResizeTooltip: React.FC<ResizeTooltipProps> = ({
  x,
  y,
  width,
  height,
  visible,
  mouseX = 0,
  mouseY = 0,
}) => {
  if (!visible) return null;
  const tooltipX = Math.max(10, mouseX + 10);
  const tooltipY = Math.max(10, mouseY - 30);
  return (
    <div
      className={cn(
        "fixed z-50 bg-surface text-white px-3 py-2 rounded-md text-xs font-mono shadow-lg border border-border pointer-events-none transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ left: `${tooltipX}px`, top: `${tooltipY}px` }}
    >
      {" "}
      <div className="flex gap-4">
        {" "}
        <div>
          {" "}
          <span className="text-slate-400">X:</span>
          {""} <span className="text-white">{Math.round(x)}</span>{" "}
        </div>{" "}
        <div>
          {" "}
          <span className="text-slate-400">Y:</span>
          {""} <span className="text-white">{Math.round(y)}</span>{" "}
        </div>{" "}
        <div>
          {" "}
          <span className="text-slate-400">W:</span>
          {""} <span className="text-cyan-400">{Math.round(width)}</span>{" "}
        </div>{" "}
        <div>
          {" "}
          <span className="text-slate-400">H:</span>
          {""} <span className="text-cyan-400">{Math.round(height)}</span>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
