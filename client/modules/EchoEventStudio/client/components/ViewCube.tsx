import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "lucide-react";
export type ViewPreset = "top" | "front" | "right" | "persp";
export interface ViewCubeProps {
  onView: (view: ViewPreset) => void;
}
export function ViewCube({ onView }: ViewCubeProps) {
  const views: Array<{ preset: ViewPreset; label: string; icon?: string }> = [
    { preset: "top", label: "Top" },
    { preset: "front", label: "Front" },
    { preset: "right", label: "Right" },
    { preset: "persp", label: "Perspective" },
  ];
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm flex items-center gap-2">
          {" "}
          <Box className="h-4 w-4" /> View Cube{" "}
        </CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          {views.map((view) => (
            <Button
              key={view.preset}
              onClick={() => onView(view.preset)}
              variant="outline"
              className="h-8 text-xs"
              title={`Jump to ${view.label} view`}
            >
              {" "}
              {view.label}{" "}
            </Button>
          ))}{" "}
        </div>{" "}
        <div className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
          {" "}
          Quick camera presets. Click to jump to preset view.{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
