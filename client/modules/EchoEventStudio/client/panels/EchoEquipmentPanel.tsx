/** * EchoEquipmentPanel * Floating panel containing the equipment palette for placement * Works in tandem with EchoLayoutPanel */ import React from "react";
import { EquipmentPalette } from "@/components/EquipmentPalette";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
interface EchoEquipmentPanelProps {
  onClose?: () => void;
}
export default function EchoEquipmentPanel({
  onClose,
}: EchoEquipmentPanelProps) {
  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {" "}
      {/* Header */}{" "}
      <div className="border-b border-border/40 bg-card/40 backdrop-blur-sm px-4 py-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex-1">
            {" "}
            <h2 className="text-base font-semibold">Equipment Library</h2>{" "}
            <p className="text-xs text-muted-foreground mt-0.5">
              {" "}
              Chafers • Carving • Heat Lamps • Bowls{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Badge variant="secondary">Equipment</Badge>{" "}
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                {" "}
                ✕{" "}
              </Button>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Equipment Palette */}{" "}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {" "}
        <EquipmentPalette />{" "}
      </div>{" "}
    </div>
  );
}
