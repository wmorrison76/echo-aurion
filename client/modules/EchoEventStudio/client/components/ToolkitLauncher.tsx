import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3X3, Zap } from "lucide-react";
export interface ToolkitLauncherProps {
  onOpenOutliner?: () => void;
  onOpenVariants?: () => void;
  onOpenEvents?: () => void;
  onOpenEquipment?: () => void;
}
export function ToolkitLauncher({
  onOpenOutliner,
  onOpenVariants,
  onOpenEvents,
  onOpenEquipment,
}: ToolkitLauncherProps) {
  const tools = [
    {
      label: "Outliner",
      description: "Scene hierarchy",
      onClick: onOpenOutliner,
    },
    {
      label: "Variants",
      description: "A/B/C layouts",
      onClick: onOpenVariants,
    },
    { label: "Events", description: "Event studio", onClick: onOpenEvents },
    {
      label: "Equipment",
      description: "Place items",
      onClick: onOpenEquipment,
    },
  ];
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm flex items-center gap-2">
          {" "}
          <Zap className="h-4 w-4" /> Toolkit Launcher{" "}
        </CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          {tools.map((tool) => (
            <Button
              key={tool.label}
              onClick={tool.onClick}
              variant="outline"
              className="h-auto py-2 px-2 flex flex-col items-start gap-1 text-left"
            >
              {" "}
              <div className="text-xs font-semibold">{tool.label}</div>{" "}
              <div className="text-[10px] text-muted-foreground">
                {" "}
                {tool.description}{" "}
              </div>{" "}
            </Button>
          ))}{" "}
        </div>{" "}
        <div className="text-[10px] text-muted-foreground border-t pt-2">
          {" "}
          Quick access to essential panels. Click any tool to open.{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
