import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSnapStore } from "@/store/snapStore";
export function SnapPrefsCard() {
  const {
    gridSize,
    angleInc,
    objectTol,
    setGridSize,
    setAngleInc,
    setObjectTol,
  } = useSnapStore();
  return (
    <Card className="w-full">
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Snap Preferences</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {" "}
          <label className="flex flex-col gap-1">
            {" "}
            <span className="font-medium text-muted-foreground">
              Grid (m)
            </span>{" "}
            <Input
              type="number"
              step="0.05"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="h-7 text-xs"
            />{" "}
          </label>{" "}
          <label className="flex flex-col gap-1">
            {" "}
            <span className="font-medium text-muted-foreground">
              Angle (°)
            </span>{" "}
            <Input
              type="number"
              step="1"
              value={angleInc}
              onChange={(e) => setAngleInc(Number(e.target.value))}
              className="h-7 text-xs"
            />{" "}
          </label>{" "}
          <label className="flex flex-col gap-1">
            {" "}
            <span className="font-medium text-muted-foreground">
              Obj tol (m)
            </span>{" "}
            <Input
              type="number"
              step="0.01"
              value={objectTol}
              onChange={(e) => setObjectTol(Number(e.target.value))}
              className="h-7 text-xs"
            />{" "}
          </label>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
