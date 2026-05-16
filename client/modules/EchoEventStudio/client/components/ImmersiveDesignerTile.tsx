/** * ImmersiveDesignerTile * Tile component for TemplatePicker showing the immersive dining designer * Can be added to any template/layout grid */ import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import EchoLayoutPanel from "@/panels/EchoLayoutPanel";
import EchoEquipmentPanel from "@/panels/EchoEquipmentPanel";
interface ImmersiveDesignerTileProps {
  onOpen?: (panel: {
    id: string;
    title: string;
    component: React.ComponentType<any>;
  }) => void;
  className?: string;
}
export function ImmersiveDesignerTile({
  onOpen,
  className,
}: ImmersiveDesignerTileProps) {
  const handleOpenDesigner = () => {
    if (onOpen) {
      onOpen({
        id: "panel:echolayout",
        title: "EchoLayout • Immersive Designer",
        component: EchoLayoutPanel,
      });
    }
  };
  const handleOpenEquipment = () => {
    if (onOpen) {
      onOpen({
        id: "panel:equipment",
        title: "Equipment Library",
        component: EchoEquipmentPanel,
      });
    }
  };
  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <CardTitle className="text-base">
          Immersive Dining Designer
        </CardTitle>{" "}
        <p className="text-xs text-muted-foreground mt-2">
          {" "}
          Interactive 3D layout editor with AI-powered suggestions, equipment
          placement, and real-time buffet flow visualization.{" "}
        </p>{" "}
      </CardHeader>{" "}
      <Separator />{" "}
      <CardContent className="pt-4 space-y-3">
        {" "}
        <div className="space-y-1 text-sm">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="text-muted-foreground">✓</span>{" "}
            <span>Professional 3D dining layouts</span>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="text-muted-foreground">✓</span>{" "}
            <span>AI-driven generation (EchoAi³)</span>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="text-muted-foreground">✓</span>{" "}
            <span>Equipment & fixture placement</span>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="text-muted-foreground">✓</span>{" "}
            <span>GL code & cost center tracking</span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="pt-2 flex gap-2">
          {" "}
          <Button className="flex-1" onClick={handleOpenDesigner}>
            {" "}
            Open Designer{" "}
          </Button>{" "}
          <Button variant="outline" onClick={handleOpenEquipment}>
            {" "}
            Equipment{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
