/** * Equipment Palette Component * UI for selecting and arming equipment placement in the 3D scene */ import React from "react";
import { EQUIPMENT } from "@/lib/equipment";
import {
  armEquipmentPlacement,
  sayToAssistant,
} from "@/hooks/useEchoLayoutBus";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
export function EquipmentPalette() {
  return (
    <Card className="h-full flex flex-col">
      {" "}
      <CardHeader className="py-3 pb-2">
        {" "}
        <CardTitle className="text-sm">Banquet Equipment</CardTitle>{" "}
        <p className="text-xs text-muted-foreground mt-1">
          {" "}
          Click"Place" to arm equipment, then click on the floor to
          position{" "}
        </p>{" "}
      </CardHeader>{" "}
      <Separator />{" "}
      <CardContent className="flex-1 overflow-y-auto p-3">
        {" "}
        <div className="space-y-3">
          {" "}
          {Object.values(EQUIPMENT).map((equipment) => (
            <div
              key={equipment.key}
              className="rounded-md border p-3 hover:bg-accent/50 transition"
            >
              {" "}
              <div className="flex items-start justify-between mb-2">
                {" "}
                <div>
                  {" "}
                  <div className="text-sm font-semibold">
                    {equipment.name}
                  </div>{" "}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {" "}
                    {equipment.description}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                {" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <span className="text-muted-foreground">Size:</span>{" "}
                  <span className="font-mono">
                    {" "}
                    {equipment.size[0].toFixed(2)}×
                    {equipment.size[2].toFixed(2)}m{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <span className="text-muted-foreground">Height:</span>{" "}
                  <span className="font-mono">
                    {equipment.size[1].toFixed(2)}m
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex flex-wrap gap-1 mb-3">
                {" "}
                {equipment.glCode && (
                  <Badge variant="secondary" className="text-xs">
                    {" "}
                    {equipment.glCode}{" "}
                  </Badge>
                )}{" "}
                {equipment.costCenter && (
                  <Badge variant="secondary" className="text-xs">
                    {" "}
                    {equipment.costCenter}{" "}
                  </Badge>
                )}{" "}
              </div>{" "}
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  armEquipmentPlacement(equipment.key);
                  sayToAssistant(
                    `Armed placement for ${equipment.name}. Click on the floor to place it.`,
                  );
                }}
              >
                {" "}
                Place{" "}
              </Button>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
