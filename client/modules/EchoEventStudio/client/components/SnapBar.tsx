import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export interface SnapBarProps {
  grid?: boolean;
  angle?: boolean;
  object?: boolean;
  onChange?: (state: {
    grid: boolean;
    angle: boolean;
    object: boolean;
  }) => void;
}
export function SnapBar({
  grid = true,
  angle = true,
  object = false,
  onChange,
}: SnapBarProps) {
  const [state, setState] = useState({ grid, angle, object });
  const toggle = (key: keyof typeof state) => {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    onChange?.(next);
  };
  return (
    <div className="rounded-md border bg-background/70 backdrop-blur px-2 py-1 flex items-center gap-2 text-xs">
      {" "}
      <Badge
        onClick={() => toggle("grid")}
        variant={state.grid ? "default" : "secondary"}
        className="cursor-pointer"
      >
        {" "}
        Grid{" "}
      </Badge>{" "}
      <Badge
        onClick={() => toggle("angle")}
        variant={state.angle ? "default" : "secondary"}
        className="cursor-pointer"
      >
        {" "}
        Angle (15°){" "}
      </Badge>{" "}
      <Badge
        onClick={() => toggle("object")}
        variant={state.object ? "default" : "secondary"}
        className="cursor-pointer"
      >
        {" "}
        Object{" "}
      </Badge>{" "}
      <Button size="sm" variant="ghost" className="ml-2 h-5 text-xs px-2">
        {" "}
        Prefs{" "}
      </Button>{" "}
    </div>
  );
}
